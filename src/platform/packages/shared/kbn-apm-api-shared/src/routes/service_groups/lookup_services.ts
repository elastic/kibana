/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import * as t from 'io-ts';
import type { AgentName } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt, kueryRt } from '../../default_api_types';

export type LookupServicesResponse = Array<{
  serviceName: string;
  environments: string[];
  agentName: AgentName;
}>;

export interface LookupServicesRouteResponse {
  items: LookupServicesResponse;
}

export const serviceGroupServicesRoute = defineRoute<LookupServicesRouteResponse>()({
  endpoint: 'GET /internal/apm/service-group/services',
  params: t.type({
    query: t.intersection([rangeRt, t.partial(kueryRt.props)]),
  }),
});
