/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EVENT_OUTCOME_FIELD,
  OTEL_DURATION,
  OTEL_EVENT_NAME_FIELD,
  OTEL_SPAN_KIND,
  OTEL_STATUS_CODE,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_NAME_FIELD,
  TIMESTAMP_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import type { DataSourceProfileProvider } from '../../../../profiles';

const ECS_TRACE_FIELDS = [
  TIMESTAMP_FIELD,
  SERVICE_NAME_FIELD,
  TRANSACTION_NAME_FIELD,
  SPAN_NAME_FIELD,
  TRANSACTION_DURATION_FIELD,
  SPAN_DURATION_FIELD,
  EVENT_OUTCOME_FIELD,
];

const OTEL_TRACE_FIELDS = [
  TIMESTAMP_FIELD,
  SERVICE_NAME_FIELD,
  OTEL_SPAN_KIND,
  OTEL_DURATION,
  OTEL_STATUS_CODE,
  OTEL_EVENT_NAME_FIELD,
];

const ALL_TRACE_FIELDS = Array.from(new Set([...ECS_TRACE_FIELDS, ...OTEL_TRACE_FIELDS]));

const isOtelTraces = (columns: Array<{ name: string }> | undefined): boolean => {
  if (!columns?.length) return false;
  return columns.some(
    (col) =>
      col.name === OTEL_SPAN_KIND ||
      col.name === OTEL_STATUS_CODE ||
      col.name.startsWith('attributes.')
  );
};

export const getDeepAnalysisPlaybook: DataSourceProfileProvider['profile']['getDeepAnalysisPlaybook'] =
  () => (params) => {
    if (isOtelTraces(params.columns)) {
      return {
        shapeId: 'traces-otel',
        shapeLabel: 'OTel traces & spans',
        characteristicFields: ALL_TRACE_FIELDS,
        promptAddendum:
          'This dataset is OTel traces. Deep analysis means latency (p50/p95/p99 ' +
          'of `duration`), throughput grouped by `service.name` and `kind` or ' +
          "`event_name`, and error rate via `status.code='ERROR'`. Group by " +
          'service.name then by event_name or kind; never group by trace/span ids.',
        interestingSignals: [
          'latency outliers per service (p99 vs p50 spread)',
          'spans where status.code=ERROR',
          'top server-kind spans by duration',
        ],
      };
    }

    return {
      shapeId: 'traces',
      shapeLabel: 'APM traces & spans (ECS)',
      characteristicFields: ALL_TRACE_FIELDS,
      promptAddendum:
        'This dataset is APM traces. Deep analysis means latency (p50/p95/p99 of ' +
        '*.duration.us), throughput by transaction.name or span.name, and error rate ' +
        "via event.outcome='failure'. Group by service.name then transaction.name; " +
        'never group by trace/span ids.',
      interestingSignals: [
        'latency outliers per service (p99 vs p50 spread)',
        'services with rising failure rate',
        'top transactions by total duration',
      ],
    };
  };
