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
  shouldSkipLatencySampling,
  startLatencyTracking,
} from './helpers.tracking';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';

interface InputLatencyTrackingDeps {
  telemetryService: ESQLEditorTelemetryService;
  sessionIdRef: MutableRefObject<string>;
  interactionIdRef: MutableRefObject<number>;
}

export const useInputLatencyTracking = ({
  telemetryService,
  sessionIdRef,
  interactionIdRef,
}: InputLatencyTrackingDeps) => {
  const trackingRef = useRef({
    hasFirstSample: false,
    startTime: 0,
    queryLength: 0,
    queryLines: 0,
    interactionId: 0,
  });

  const trackInputLatencyOnKeystroke = useCallback(
    (queryText: string) => {
      const interactionId = ++interactionIdRef.current;
      const tracking = trackingRef.current;

      if (shouldSkipLatencySampling(tracking, interactionId)) {
        return;
      }

      startLatencyTracking(tracking, queryText, interactionId);
    },
    [interactionIdRef]
  );

  const reportInputLatency = useCallback(() => {
    const result = endLatencyTracking(trackingRef.current);

    if (!result) {
      return;
    }

    telemetryService.trackInputLatency({
      ...result,
      sessionId: sessionIdRef.current,
    });
  }, [sessionIdRef, telemetryService]);

  return {
    trackInputLatencyOnKeystroke,
    reportInputLatency,
  };
};
