/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType, type ObservableCallback } from '@opentelemetry/api';
import { type Observable, combineLatest, takeUntil } from 'rxjs';
import {
  ServiceStatusLevels,
  type CoreStatus,
  type ServiceStatus,
  type ServiceStatusLevel,
} from '@kbn/core-status-common';

const STATUS_LEVELS: readonly ServiceStatusLevel[] = [
  ServiceStatusLevels.available,
  ServiceStatusLevels.degraded,
  ServiceStatusLevels.unavailable,
  ServiceStatusLevels.critical,
];

interface RegisterStatusOtelMetricsParams {
  overall$: Observable<ServiceStatus>;
  core$: Observable<CoreStatus>;
  stop$: Observable<void>;
}

/**
 * Reports the overall and core services' status levels as OpenTelemetry metrics.
 */
export const registerStatusOtelMetrics = ({
  overall$,
  core$,
  stop$,
}: RegisterStatusOtelMetricsParams): void => {
  let latestStatuses: Record<string, ServiceStatus> = {};

  combineLatest([overall$, core$])
    .pipe(takeUntil(stop$))
    .subscribe(([overall, core]) => {
      latestStatuses = { overall, ...core };
    });

  const meter = metrics.getMeter('kibana.status');

  // Inactive levels must be reported as 0, otherwise the previous level's series goes stale instead of dropping to 0.
  const stateCallback: ObservableCallback = (result) => {
    for (const [service, { level }] of Object.entries(latestStatuses)) {
      for (const candidate of STATUS_LEVELS) {
        result.observe(candidate === level ? 1 : 0, {
          'kibana.status.service': service,
          'kibana.status.level': candidate.toString(),
        });
      }
    }
  };
  const stateMetric = meter.createObservableUpDownCounter('kibana.status.state', {
    description:
      'The status level of a Kibana service: 1 for the current level, 0 for the others. Use `kibana.status.service` to select the service (`overall`, `elasticsearch`, ...).',
    unit: '1',
    valueType: ValueType.INT,
  });
  stateMetric.addCallback(stateCallback);

  const severityCallback: ObservableCallback = (result) => {
    for (const [service, { level }] of Object.entries(latestStatuses)) {
      result.observe(level.valueOf(), { 'kibana.status.service': service });
    }
  };
  const severityMetric = meter.createObservableGauge('kibana.status.severity', {
    description:
      'The severity of the status level of a Kibana service: 0 (available), 1 (degraded), 2 (unavailable), 3 (critical).',
    unit: '1',
    valueType: ValueType.INT,
  });
  severityMetric.addCallback(severityCallback);

  stop$.subscribe(() => {
    stateMetric.removeCallback(stateCallback);
    severityMetric.removeCallback(severityCallback);
  });
};
