/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, type MutableRefObject } from 'react';
import type { TelemetryLatencyProps } from '@kbn/esql-types';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';

const isTestEnv = process.env.NODE_ENV === 'test';

// Sample rates are set to 100% in test environment to get all available data on performance journeys.
const DEFAULT_SAMPLE_RATE = isTestEnv ? 100 : 25;
const INPUT_SAMPLE_RATE = isTestEnv ? 100 : 10;

interface InitLatencyTrackingDeps {
  telemetryService: ESQLEditorTelemetryService;
  sessionIdRef: MutableRefObject<string>;
}

export const useInitLatencyTracking = ({
  telemetryService,
  sessionIdRef,
}: InitLatencyTrackingDeps) => {
  const initTrackingRef = useRef({
    complete: false,
    startTime: performance.now(),
  });

  const reportInitLatency = useCallback(() => {
    if (initTrackingRef.current.complete) {
      return;
    }

    const duration = performance.now() - initTrackingRef.current.startTime;
    telemetryService.trackInitLatency(duration, sessionIdRef.current);
    initTrackingRef.current.complete = true;
  }, [sessionIdRef, telemetryService]);

  return {
    reportInitLatency,
  };
};

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

      if (shouldSkipLatencySampling(tracking, interactionId, INPUT_SAMPLE_RATE)) {
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

interface SuggestionsLatencyTrackingDeps {
  telemetryService: ESQLEditorTelemetryService;
  sessionIdRef: MutableRefObject<string>;
  // Internal counter for deterministic sampling; not emitted in telemetry payloads.
  interactionIdRef: MutableRefObject<number>;
}

export const useSuggestionsLatencyTracking = ({
  telemetryService,
  sessionIdRef,
  interactionIdRef,
}: SuggestionsLatencyTrackingDeps) => {
  const suggestionsTrackingRef = useRef({
    hasFirstSample: false,
    startTime: 0,
    queryLength: 0,
    queryLines: 0,
    interactionId: 0,
  });

  const resetSuggestionsTracking = useCallback(() => {
    resetTracking(suggestionsTrackingRef.current);
  }, []);

  const onSuggestionsReady = useCallback(
    (computeStart: number, computeEnd: number, queryLength: number, queryLines: number) => {
      const tracking = suggestionsTrackingRef.current;
      const interactionId = ++interactionIdRef.current;

      if (shouldSkipLatencySampling(tracking, interactionId) || computeEnd < computeStart) {
        return;
      }

      const duration = computeEnd - computeStart;
      const isInitialLoad = !tracking.hasFirstSample;
      tracking.hasFirstSample = true;
      resetTracking(tracking);

      telemetryService.trackSuggestionsLatency({
        duration,
        queryLength,
        queryLines,
        isInitialLoad,
        sessionId: sessionIdRef.current,
      });
    },
    [interactionIdRef, sessionIdRef, telemetryService]
  );

  return {
    onSuggestionsReady,
    resetSuggestionsTracking,
  };
};

interface ValidationLatencyTrackingDeps {
  telemetryService: ESQLEditorTelemetryService;
  sessionIdRef: MutableRefObject<string>;
  // Internal counter for deterministic sampling; not emitted in telemetry payloads.
  interactionIdRef: MutableRefObject<number>;
}

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
      if (shouldSkipLatencySampling(trackingRef.current, interactionIdRef.current)) {
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

interface BaseTracking {
  hasFirstSample: boolean;
  startTime: number;
  queryLength: number;
  queryLines: number;
  interactionId: number;
}

// First event always captured. Subsequent events use deterministic sampling
// based on interactionId (every Nth interaction is sampled).
const shouldSkipLatencySampling = (
  tracking: BaseTracking,
  interactionId: number,
  sampleRatePercent: number = DEFAULT_SAMPLE_RATE
): boolean => {
  if (tracking.startTime > 0) {
    // First-wins: avoid overlapping measurements by keeping the active one.
    return true;
  }

  if (!tracking.hasFirstSample) {
    return false;
  }

  // Deterministic sampling: keep every Nth interaction (e.g. 10% => every 10th).
  const bucketSize = Math.max(1, Math.round(100 / sampleRatePercent));
  return interactionId % bucketSize !== 0;
};

const startLatencyTracking = (
  tracking: BaseTracking,
  queryText: string,
  interactionId: number
): void => {
  tracking.startTime = performance.now();
  tracking.queryLength = queryText.length;
  tracking.queryLines = queryText.split('\n').length;
  tracking.interactionId = interactionId;
};

const endLatencyTracking = (tracking: BaseTracking) => {
  if (tracking.startTime === 0) {
    return null;
  }

  const result: Omit<TelemetryLatencyProps, 'sessionId'> = {
    duration: performance.now() - tracking.startTime,
    queryLength: tracking.queryLength,
    queryLines: tracking.queryLines,
    isInitialLoad: !tracking.hasFirstSample,
  };

  tracking.hasFirstSample = true;
  resetTracking(tracking);

  return result;
};

const resetTracking = (tracking: BaseTracking): void => {
  tracking.startTime = 0;
  tracking.queryLength = 0;
  tracking.queryLines = 0;
  tracking.interactionId = 0;
};
