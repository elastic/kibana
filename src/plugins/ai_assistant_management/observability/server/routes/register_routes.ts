/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { registerRoutes } from '@kbn/server-route-repository';
import { getGlobalAIAssistantManagementObservabilityServerRouteRepository } from './get_global_ai_assistant_management_observability_route_repository';
import type { AIAssistantManagementObservabilityRouteHandlerResources } from './types';

export function registerServerRoutes({
  core,
  logger,
  dependencies,
}: {
  core: CoreSetup;
  logger: Logger;
  dependencies: Omit<
    AIAssistantManagementObservabilityRouteHandlerResources,
    'request' | 'context' | 'logger' | 'params'
  >;
}) {
  registerRoutes({
    core,
    logger,
    repository: getGlobalAIAssistantManagementObservabilityServerRouteRepository(),
    dependencies,
  });
}
