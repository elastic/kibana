/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface FallbackToTransactionsResponse {
  fallbackToTransactions: boolean;
}

export const fallbackToTransactionsRoute = defineRoute<FallbackToTransactionsResponse>()({
  endpoint: 'GET /internal/apm/fallback_to_transactions',
  params: t.partial({
    query: t.intersection([kueryRt, t.partial(rangeRt.props)]),
  }),
});
