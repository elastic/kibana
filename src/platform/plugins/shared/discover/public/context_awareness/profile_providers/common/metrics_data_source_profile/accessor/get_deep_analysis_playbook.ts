/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TIMESTAMP_FIELD } from '@kbn/discover-utils';
import type { MetricsExperienceDataSourceProfileProvider } from '../profile';

export const getDeepAnalysisPlaybook: MetricsExperienceDataSourceProfileProvider['profile']['getDeepAnalysisPlaybook'] =
  () => () => ({
    shapeId: 'metrics',
    shapeLabel: 'TSDB metrics (TS commands)',
    characteristicFields: [TIMESTAMP_FIELD],
    guidance:
      'This dataset is TSDB metrics queried via the ES|QL TS command. ALL ' +
      'follow-up queries against this index MUST start with `TS <index>` ' +
      '(never `FROM <index>`). FIRST run `TS <index> | TS_INFO` to discover ' +
      'metric_name, metric_type, and dimension_fields. Then aggregate with ' +
      '`TS <index> | STATS <agg>(<metric>) BY <dimension>, BUCKET(@timestamp, ...)`. ' +
      'Choose <agg> from metric_type — counter: RATE or SUM; gauge: AVG, MAX, ' +
      'MIN, or PERCENTILE; histogram: PERCENTILE. Avoid raw row enumeration.',
    interestingSignals: [
      'metrics with the largest rate-of-change in the time window',
      'dimensions with diverging trends for the same metric',
      'percentile drift (p95/p99) over time',
    ],
  });
