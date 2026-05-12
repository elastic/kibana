/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { LatencyCorrelation } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';
import { correlationsTransactionQueryRt } from './types';

export interface SignificantCorrelationsResponse {
  latencyCorrelations: LatencyCorrelation[];
  ccsWarning: boolean;
  totalDocCount: number;
  fallbackResult?: LatencyCorrelation;
}

export const significantCorrelationsTransactionsRoute =
  defineRoute<SignificantCorrelationsResponse>()({
    endpoint: 'POST /internal/apm/correlations/significant_correlations/transactions',
    params: t.type({
      body: t.intersection([
        t.partial({
          durationMin: toNumberRt,
          durationMax: toNumberRt,
        }),
        correlationsTransactionQueryRt,
        environmentRt,
        kueryRt,
        rangeRt,
        t.type({
          fieldValuePairs: t.array(
            t.type({
              fieldName: t.string,
              fieldValue: t.union([t.string, toNumberRt]),
            })
          ),
        }),
      ]),
    }),
  });
