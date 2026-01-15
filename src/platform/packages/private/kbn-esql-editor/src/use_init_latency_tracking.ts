/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useRef, type MutableRefObject } from 'react';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';

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
