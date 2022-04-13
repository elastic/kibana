/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Subject } from 'rxjs';
import type { Event, TelemetryCounter } from '../../../events';
import { TelemetryCounterType } from '../../../events';

/**
 * Creates a telemetry counter helper to make it easier to generate them
 * @param telemetryCounter$ The observable that will be used to emit the telemetry counters
 * @param source The name of the shipper that is sending the events.
 */
export function createTelemetryCounterHelper(
  telemetryCounter$: Subject<TelemetryCounter>,
  source: string
) {
  /**
   * Triggers a telemetry counter for each event type.
   * @param events The events to trigger the telemetry counter for.
   * @param type The type of telemetry counter to trigger.
   * @param code The success or error code for additional detail about the result.
   * @param error The error that occurred, if any.
   */
  return (
    events: Event[],
    { type, code, error }: { type?: TelemetryCounterType; code?: string; error?: Error } = {}
  ) => {
    const eventTypeCounts = countEventTypes(events);
    Object.entries(eventTypeCounts).forEach(([eventType, count]) => {
      telemetryCounter$.next({
        source,
        type: type ?? (error ? TelemetryCounterType.failed : TelemetryCounterType.succeeded),
        code: code ?? error?.message ?? 'OK',
        count,
        event_type: eventType,
      });
    });
  };
}

function countEventTypes(events: Event[]) {
  return events.reduce((acc, event) => {
    if (acc[event.event_type]) {
      acc[event.event_type] += 1;
    } else {
      acc[event.event_type] = 1;
    }
    return acc;
  }, {} as Record<string, number>);
}
