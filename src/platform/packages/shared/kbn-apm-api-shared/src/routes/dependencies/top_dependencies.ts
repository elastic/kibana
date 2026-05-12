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
import type { ConnectionStats, Node } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export interface TopDependenciesResponse {
  dependencies: Array<{
    currentStats: ConnectionStats & { impact: number };
    previousStats: (ConnectionStats & { impact: number }) | null;
    location: Node;
  }>;
  sampled: boolean;
}

export const topDependenciesRoute = defineRoute<TopDependenciesResponse>()({
  endpoint: 'GET /internal/apm/dependencies/top_dependencies',
  params: t.type({
    query: t.intersection([rangeRt, environmentRt, kueryRt, t.type({ numBuckets: toNumberRt })]),
  }),
});
