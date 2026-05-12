/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt, type AgentName } from '@kbn/apm-types';
import type { TRANSACTION_NAME, SERVICE_NAME } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, probabilityRt } from '../../default_api_types';

export type BucketKey = Record<typeof TRANSACTION_NAME | typeof SERVICE_NAME, string>;

export interface TopTracesPrimaryStatsResponse {
  items: Array<{
    key: BucketKey;
    serviceName: string;
    transactionName: string;
    averageResponseTime: number | null;
    transactionsPerMinute: number;
    transactionType: string;
    impact: number;
    agentName: AgentName;
  }>;
}

export const tracesRoute = defineRoute<TopTracesPrimaryStatsResponse>()({
  endpoint: 'GET /internal/apm/traces',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt, probabilityRt]),
  }),
});
