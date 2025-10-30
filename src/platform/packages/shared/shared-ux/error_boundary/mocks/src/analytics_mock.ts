/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';

export interface TelemetryEvent {
  type: string;
  payload: unknown;
  at: number;
}

export interface AnalyticsMock {
  analytics: { reportEvent: (type: string, payload: unknown) => void };
  getEvents(): TelemetryEvent[];
  clear(): void;
  subscribe(cb: (events: TelemetryEvent[]) => void): () => void;
}

export function createAnalyticsMock(): AnalyticsMock {
  const events: TelemetryEvent[] = [];
  const subscribers = new Set<(events: TelemetryEvent[]) => void>();
  const reportAction = action('Report telemetry event');

  function notify() {
    subscribers.forEach((cb) => cb([...events]));
  }

  return {
    analytics: {
      reportEvent: (type: string, payload: unknown) => {
        reportAction(type, payload);
        events.push({ type, payload, at: Date.now() });
        notify();
      },
    },
    getEvents: () => [...events],
    clear: () => {
      events.splice(0, events.length);
      notify();
    },
    subscribe: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };
}
