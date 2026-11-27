/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { metrics, type Meter, type ObservableCallback } from '@opentelemetry/api';
import { ServiceStatusLevels, type CoreStatus, type ServiceStatus } from '@kbn/core-status-common';
import { registerStatusOtelMetrics } from './register_status_otel_metrics';

const available: ServiceStatus = { level: ServiceStatusLevels.available, summary: 'available' };
const degraded: ServiceStatus = { level: ServiceStatusLevels.degraded, summary: 'degraded' };
const critical: ServiceStatus = { level: ServiceStatusLevels.critical, summary: 'critical' };

describe('registerStatusOtelMetrics', () => {
  let instruments: Map<string, { callbacks: Set<ObservableCallback> }>;
  let overall$: BehaviorSubject<ServiceStatus>;
  let core$: BehaviorSubject<CoreStatus>;
  let stop$: Subject<void>;

  const createInstrument = (name: string) => {
    const callbacks = new Set<ObservableCallback>();
    instruments.set(name, { callbacks });
    return {
      addCallback: jest.fn((cb: ObservableCallback) => callbacks.add(cb)),
      removeCallback: jest.fn((cb: ObservableCallback) => callbacks.delete(cb)),
    };
  };

  const collect = (name: string) => {
    const observe = jest.fn();
    instruments.get(name)?.callbacks.forEach((cb) => cb({ observe }));
    return observe.mock.calls;
  };

  beforeEach(() => {
    instruments = new Map();
    jest.spyOn(metrics, 'getMeter').mockReturnValue({
      createObservableUpDownCounter: jest.fn(createInstrument),
      createObservableGauge: jest.fn(createInstrument),
    } as unknown as Meter);

    overall$ = new BehaviorSubject<ServiceStatus>(available);
    core$ = new BehaviorSubject<CoreStatus>({ elasticsearch: available, savedObjects: available });
    stop$ = new Subject<void>();
    registerStatusOtelMetrics({ overall$, core$, stop$ });
  });

  afterEach(() => {
    jest.mocked(metrics.getMeter).mockRestore();
  });

  test('uses the kibana.status meter', () => {
    expect(metrics.getMeter).toHaveBeenCalledWith('kibana.status');
  });

  describe('kibana.status.state', () => {
    test('reports 1 for the current level and 0 for the others, for every service', () => {
      overall$.next(degraded);
      core$.next({ elasticsearch: critical, savedObjects: available });

      expect(collect('kibana.status.state')).toEqual([
        [0, { 'kibana.status.service': 'overall', 'kibana.status.level': 'available' }],
        [1, { 'kibana.status.service': 'overall', 'kibana.status.level': 'degraded' }],
        [0, { 'kibana.status.service': 'overall', 'kibana.status.level': 'unavailable' }],
        [0, { 'kibana.status.service': 'overall', 'kibana.status.level': 'critical' }],
        [0, { 'kibana.status.service': 'elasticsearch', 'kibana.status.level': 'available' }],
        [0, { 'kibana.status.service': 'elasticsearch', 'kibana.status.level': 'degraded' }],
        [0, { 'kibana.status.service': 'elasticsearch', 'kibana.status.level': 'unavailable' }],
        [1, { 'kibana.status.service': 'elasticsearch', 'kibana.status.level': 'critical' }],
        [1, { 'kibana.status.service': 'savedObjects', 'kibana.status.level': 'available' }],
        [0, { 'kibana.status.service': 'savedObjects', 'kibana.status.level': 'degraded' }],
        [0, { 'kibana.status.service': 'savedObjects', 'kibana.status.level': 'unavailable' }],
        [0, { 'kibana.status.service': 'savedObjects', 'kibana.status.level': 'critical' }],
      ]);
    });
  });

  describe('kibana.status.severity', () => {
    test('reports the numeric severity of every service', () => {
      overall$.next(degraded);
      core$.next({ elasticsearch: critical, savedObjects: available });

      expect(collect('kibana.status.severity')).toEqual([
        [1, { 'kibana.status.service': 'overall' }],
        [3, { 'kibana.status.service': 'elasticsearch' }],
        [0, { 'kibana.status.service': 'savedObjects' }],
      ]);
    });
  });

  test('does not report anything until both overall and core statuses are known', () => {
    instruments = new Map();
    registerStatusOtelMetrics({
      overall$: new Subject<ServiceStatus>(),
      core$: new BehaviorSubject<CoreStatus>({ elasticsearch: available, savedObjects: available }),
      stop$,
    });

    expect(collect('kibana.status.state')).toEqual([]);
    expect(collect('kibana.status.severity')).toEqual([]);
  });

  test('removes the callbacks on stop', () => {
    stop$.next();

    expect(collect('kibana.status.state')).toEqual([]);
    expect(collect('kibana.status.severity')).toEqual([]);
  });
});
