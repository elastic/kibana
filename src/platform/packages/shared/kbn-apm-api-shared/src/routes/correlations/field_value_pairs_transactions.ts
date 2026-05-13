/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { FieldValuePair } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';
import { correlationsTransactionQueryRt } from './types';

export interface FieldValuePairsResponse {
  fieldValuePairs: FieldValuePair[];
  errors: any[];
}

export const fieldValuePairsTransactionsRoute = defineRoute<FieldValuePairsResponse>()({
  endpoint: 'POST /internal/apm/correlations/field_value_pairs/transactions',
  params: t.type({
    body: t.intersection([
      correlationsTransactionQueryRt,
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({ fieldCandidates: t.array(t.string) }),
    ]),
  }),
});
