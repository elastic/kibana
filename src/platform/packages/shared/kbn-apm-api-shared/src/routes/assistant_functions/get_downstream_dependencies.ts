/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { downstreamDependenciesRouteRt, type APMDownstreamDependency } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface GetDownstreamDependenciesResponse {
  content: APMDownstreamDependency[];
}

export const getDownstreamDependenciesRoute = defineRoute<GetDownstreamDependenciesResponse>()({
  endpoint: 'GET /internal/apm/assistant/get_downstream_dependencies',
  params: t.type({
    query: downstreamDependenciesRouteRt,
  }),
});
