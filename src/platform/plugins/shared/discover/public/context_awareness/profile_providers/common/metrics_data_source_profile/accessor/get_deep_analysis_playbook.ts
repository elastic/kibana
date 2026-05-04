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

const NUMERIC_ESQL_TYPES = new Set(['double', 'long', 'integer', 'float', 'unsigned_long']);

export const getDeepAnalysisPlaybook: MetricsExperienceDataSourceProfileProvider['profile']['getDeepAnalysisPlaybook'] =
  () => (params) => {
    const numericFields = (params.columns ?? [])
      .filter((col) => col.type !== undefined && NUMERIC_ESQL_TYPES.has(col.type))
      .map((col) => col.name);

    return {
      shapeId: 'metrics',
      shapeLabel: 'TSDB metrics (TS commands)',
      characteristicFields: [TIMESTAMP_FIELD, ...numericFields],
      promptAddendum:
        'This dataset is TSDB metrics queried via the ES|QL TS command. ALL ' +
        'follow-up and drill-down queries against this index MUST start with ' +
        '`TS <index>` (never `FROM <index>`). Use the form: ' +
        '`TS <index> | STATS <agg> BY BUCKET(@timestamp, ...)`. Compare rates ' +
        'and percentiles per dimension across time. Avoid raw row enumeration.',
      interestingSignals: [
        'rate-of-change spikes',
        'percentile drift over the time window',
        'dimensions with diverging trends',
      ],
    };
  };
