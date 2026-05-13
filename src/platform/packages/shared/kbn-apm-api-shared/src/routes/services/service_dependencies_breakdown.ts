/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export type ServiceDependenciesBreakdownResponse = Array<{
  title: string;
  data: Array<{ x: number; y: number }>;
}>;

export interface ServiceDependenciesBreakdownRouteResponse {
  breakdown: ServiceDependenciesBreakdownResponse;
}

export const serviceDependenciesBreakdownRoute =
  defineRoute<ServiceDependenciesBreakdownRouteResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/dependencies/breakdown',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([environmentRt, rangeRt, kueryRt]),
    }),
  });
