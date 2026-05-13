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
import type { ConnectionStatsItemWithImpact } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, offsetRt } from '../../default_api_types';

export type ServiceDependenciesResponse = Array<
  Omit<ConnectionStatsItemWithImpact, 'stats'> & {
    currentStats: ConnectionStatsItemWithImpact['stats'];
    previousStats: ConnectionStatsItemWithImpact['stats'] | null;
  }
>;

export interface ServiceDependenciesRouteResponse {
  serviceDependencies: ServiceDependenciesResponse;
}

export const serviceDependenciesRoute = defineRoute<ServiceDependenciesRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([t.type({ numBuckets: toNumberRt }), environmentRt, rangeRt, offsetRt]),
  }),
});
