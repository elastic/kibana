/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, type MutableRefObject } from 'react';
import type { monaco } from '@kbn/monaco';
import {
  endSuggestionsLatencyTracking,
  resetTracking,
  shouldSkipLatencySampling,
  type SuggestionsTracking,
} from './helpers.tracking';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';

interface SuggestionsVersionTiming {
  timestamp: number;
  queryLength: number;
  queryLines: number;
  interactionId: number;
}

interface SuggestionsLatencyTrackingDeps {
  editorModelRef: MutableRefObject<monaco.editor.ITextModel | undefined>;
  telemetryService: ESQLEditorTelemetryService;
  sessionIdRef: MutableRefObject<string>;
  interactionIdRef: MutableRefObject<number>;
}

const SUGGESTIONS_SAMPLE_RATE = 25;
const MAX_VERSION_TIMINGS = 50;

export const useSuggestionsLatencyTracking = ({
  editorModelRef,
  telemetryService,
  sessionIdRef,
  interactionIdRef,
}: SuggestionsLatencyTrackingDeps) => {
  const suggestionsTrackingRef = useRef<SuggestionsTracking>({
    hasFirstSample: false,
    startTime: 0,
    queryLength: 0,
    queryLines: 0,
    interactionId: 0,
    computeStart: 0,
    computeEnd: 0,
  });

  // Map lets us store per-version timing and evict the oldest entry efficiently.
  const suggestionsVersionTimingRef = useRef<Map<number, SuggestionsVersionTiming>>(new Map());

  // Track text version timestamps so we can correlate keystrokes with provider compute timing.
  const recordSuggestionsVersionTiming = useCallback(
    (model: monaco.editor.ITextModel) => {
      const versionId = model.getAlternativeVersionId();

      suggestionsVersionTimingRef.current.set(versionId, {
        timestamp: performance.now(),
        queryLength: model.getValueLength(),
        queryLines: model.getLineCount(),
        interactionId: interactionIdRef.current,
      });

      // small guard: Keep only recent versions to avoid unbounded growth.
      if (suggestionsVersionTimingRef.current.size > MAX_VERSION_TIMINGS) {
        const oldestKey = suggestionsVersionTimingRef.current.keys().next().value;

        if (oldestKey !== undefined) {
          suggestionsVersionTimingRef.current.delete(oldestKey);
        }
      }
    },
    [interactionIdRef]
  );

  const resetSuggestionsTracking = useCallback(() => {
    const tracking = suggestionsTrackingRef.current;
    resetTracking(tracking);
    tracking.computeStart = 0;
    tracking.computeEnd = 0;
    suggestionsVersionTimingRef.current.clear();
  }, []);

  const onSuggestionsReady = useCallback(
    (computeStart: number, computeEnd: number) => {
      const tracking = suggestionsTrackingRef.current;
      const model = editorModelRef.current;

      if (!model) {
        return;
      }

      const versionId = model.getAlternativeVersionId();
      const versionTiming = suggestionsVersionTimingRef.current.get(versionId);

      // Best-effort: without a Monaco request id we drop when timing is missing
      // (e.g. provider runs before the change event, manual invoke, or version evicted).
      if (!versionTiming) {
        return;
      }

      if (
        shouldSkipLatencySampling(tracking, versionTiming.interactionId, SUGGESTIONS_SAMPLE_RATE)
      ) {
        return;
      }

      tracking.computeStart = computeStart;
      tracking.computeEnd = computeEnd;
      tracking.startTime = versionTiming.timestamp;
      tracking.queryLength = versionTiming.queryLength;
      tracking.queryLines = versionTiming.queryLines;
      tracking.interactionId = versionTiming.interactionId;

      const result = endSuggestionsLatencyTracking(tracking);

      if (!result) {
        resetSuggestionsTracking();
        return;
      }

      telemetryService.trackSuggestionsLatency({
        ...result,
        sessionId: sessionIdRef.current,
      });
    },
    [editorModelRef, resetSuggestionsTracking, sessionIdRef, telemetryService]
  );

  return {
    onSuggestionsReady,
    recordSuggestionsVersionTiming,
    resetSuggestionsTracking,
  };
};
