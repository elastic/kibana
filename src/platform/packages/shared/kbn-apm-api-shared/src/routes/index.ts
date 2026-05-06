/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { fooRoute } from './foo';
import { barRoute } from './bar';
import { hasDataRoute } from './historical_data';
import { suggestionsRoute } from './suggestions';
import {
  agentKeysRoute,
  agentKeysPrivilegesRoute,
  invalidateAgentKeyRoute,
  createAgentKeyRoute,
} from './agent_keys';
import {
  unifiedTracesByIdRoute,
  unifiedTracesByIdSummaryRoute,
  unifiedTracesByIdErrorsRoute,
} from './traces';
import type { BuildRepository } from './types';

export const routeDefinitions = {
  foo: fooRoute,
  bar: barRoute,
  hasData: hasDataRoute,
  suggestions: suggestionsRoute,
  agentKeys: agentKeysRoute,
  agentKeysPrivileges: agentKeysPrivilegesRoute,
  invalidateAgentKey: invalidateAgentKeyRoute,
  createAgentKey: createAgentKeyRoute,
  unifiedTracesById: unifiedTracesByIdRoute,
  unifiedTracesByIdSummary: unifiedTracesByIdSummaryRoute,
  unifiedTracesByIdErrors: unifiedTracesByIdErrorsRoute,
};

export type SharedAPMRouteRepository = BuildRepository<typeof routeDefinitions>;
