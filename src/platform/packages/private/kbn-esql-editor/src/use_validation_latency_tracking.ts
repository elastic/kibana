/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, type MutableRefObject } from 'react';
import {
  endLatencyTracking,
  resetTracking,
  shouldSkipLatencySampling,
  startLatencyTracking,
} from './helpers.tracking';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';

interface ValidationLatencyTrackingDeps {
  telemetryService: ESQLEditorTelemetryService;
  sessionIdRef: MutableRefObject<string>;
  interactionIdRef: MutableRefObject<number>;
}

const VALIDATION_SAMPLE_RATE = 15;

export const useValidationLatencyTracking = ({
  telemetryService,
  sessionIdRef,
  interactionIdRef,
}: ValidationLatencyTrackingDeps) => {
  const trackingRef = useRef({
    hasFirstSample: false,
    startTime: 0,
    queryLength: 0,
    queryLines: 0,
    interactionId: 0,
  });

  const trackValidationLatencyStart = useCallback(
    (queryText: string) => {
      if (
        shouldSkipLatencySampling(
          trackingRef.current,
          interactionIdRef.current,
          VALIDATION_SAMPLE_RATE
        )
      ) {
        return;
      }

      startLatencyTracking(trackingRef.current, queryText, interactionIdRef.current);
    },
    [interactionIdRef]
  );

  const trackValidationLatencyEnd = useCallback(
    (active: boolean) => {
      if (!active) {
        return;
      }

      const result = endLatencyTracking(trackingRef.current);
      if (!result) {
        return;
      }

      telemetryService.trackValidationLatency({
        ...result,
        sessionId: sessionIdRef.current,
      });
    },
    [sessionIdRef, telemetryService]
  );

  const resetValidationTracking = useCallback(() => {
    resetTracking(trackingRef.current);
  }, []);

  return {
    trackValidationLatencyStart,
    trackValidationLatencyEnd,
    resetValidationTracking,
  };
};
