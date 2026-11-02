/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DURATION_FIELDS,
  EVENT_OUTCOME_FIELD,
  OTEL_DURATION,
  OTEL_SPAN_KIND,
  OTEL_STATUS_CODE,
  PROCESSOR_EVENT_FIELD,
  SERVICE_NAME_FIELD,
  SPAN_NAME_FIELD,
  TIMESTAMP_FIELD,
  TRACE_FIELDS,
  TRANSACTION_NAME_FIELD,
} from '@kbn/discover-utils';
import type { DataSourceProfileProvider } from '../../../../profiles';

const ECS_TRACE_FIELDS = [TIMESTAMP_FIELD, ...TRACE_FIELDS];

const OTEL_TRACE_FIELDS = [
  TIMESTAMP_FIELD,
  SERVICE_NAME_FIELD,
  OTEL_SPAN_KIND,
  OTEL_DURATION,
  OTEL_STATUS_CODE,
];

const ALL_TRACE_FIELDS = Array.from(new Set([...ECS_TRACE_FIELDS, ...OTEL_TRACE_FIELDS]));

const isUnprocessedOtelTraces = (columns: Array<{ name: string }> | undefined): boolean => {
  if (!columns?.length) return false;
  // processor.event is set by APM Server — its presence means the user opted into the APM/ECS experience.
  const isApmProcessed = columns.some((col) => col.name === PROCESSOR_EVENT_FIELD);
  if (isApmProcessed) return false;
  return columns.some(
    (col) =>
      col.name === OTEL_SPAN_KIND ||
      col.name === OTEL_STATUS_CODE ||
      col.name.startsWith('attributes.')
  );
};

export const getDeepAnalysisPlaybook: DataSourceProfileProvider['profile']['getDeepAnalysisPlaybook'] =
  () => (params) => {
    if (isUnprocessedOtelTraces(params.columns)) {
      return {
        shapeId: 'traces-otel',
        shapeLabel: 'OTel traces & spans',
        characteristicFields: ALL_TRACE_FIELDS,
        guidance:
          `This dataset is OTel traces. Deep analysis means latency (p50/p95/p99 of ${OTEL_DURATION}), ` +
          `throughput grouped by ${SERVICE_NAME_FIELD} and ${OTEL_SPAN_KIND}, ` +
          `and error rate via ${OTEL_STATUS_CODE}='ERROR'. ` +
          `Group by ${SERVICE_NAME_FIELD} then ${SPAN_NAME_FIELD} or ${OTEL_SPAN_KIND}; ` +
          `never group by trace/span ids.`,
        interestingSignals: [
          'latency outliers per service (p99 vs p50 spread)',
          `spans where ${OTEL_STATUS_CODE}=ERROR`,
          `top ${OTEL_SPAN_KIND}=server spans by ${OTEL_DURATION}`,
        ],
      };
    }

    return {
      shapeId: 'traces',
      shapeLabel: 'APM traces & spans (ECS)',
      characteristicFields: ALL_TRACE_FIELDS,
      guidance:
        `This dataset is APM traces. Deep analysis means latency (p50/p95/p99 of ${DURATION_FIELDS.join(
          ' / '
        )}), ` +
        `throughput by ${TRANSACTION_NAME_FIELD} or ${SPAN_NAME_FIELD}, ` +
        `and error rate via ${EVENT_OUTCOME_FIELD}='failure'. ` +
        `Group by ${SERVICE_NAME_FIELD} then ${TRANSACTION_NAME_FIELD} or ${SPAN_NAME_FIELD}; ` +
        `never group by trace/span ids.`,
      interestingSignals: [
        'latency outliers per service (p99 vs p50 spread)',
        'services with rising failure rate',
        'top transactions by total duration',
      ],
    };
  };
