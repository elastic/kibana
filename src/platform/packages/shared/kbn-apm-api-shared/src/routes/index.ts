/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { fooRouteDefinitions } from './foo';
import { barRouteDefinitions } from './bar';
import { historicalDataRouteDefinitions } from './historical_data';
import { suggestionsRouteDefinitions } from './suggestions';
import { agentKeysRouteDefinitions } from './agent_keys';
import { tracesRouteDefinitions } from './traces';
import type { BuildGroupedRepository } from './types';

export const routeDefinitions = {
  foo: fooRouteDefinitions,
  bar: barRouteDefinitions,
  historicalData: historicalDataRouteDefinitions,
  suggestions: suggestionsRouteDefinitions,
  agentKeys: agentKeysRouteDefinitions,
  traces: tracesRouteDefinitions,
};

export type SharedAPMRouteRepository = BuildGroupedRepository<typeof routeDefinitions>;
