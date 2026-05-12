/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { TopValuesStats } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';
import { correlationsTransactionQueryRt } from './types';

export type FieldValueStatsTransactionsResponse = TopValuesStats;

export const fieldValueStatsTransactionsRoute = defineRoute<FieldValueStatsTransactionsResponse>()(
  {
    endpoint: 'GET /internal/apm/correlations/field_value_stats/transactions',
    params: t.type({
      query: t.intersection([
        t.partial({ samplerShardSize: t.string }),
        correlationsTransactionQueryRt,
        environmentRt,
        kueryRt,
        rangeRt,
        t.type({
          fieldName: t.string,
          fieldValue: t.union([t.string, t.number]),
        }),
      ]),
    }),
  }
);
