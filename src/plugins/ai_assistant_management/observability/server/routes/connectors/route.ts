/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FindActionResult } from '@kbn/actions-plugin/server';
import { createAIAssistantManagementObservabilityServerRoute } from '../create_ai_assistant_management_observability_server_route';

const listConnectorsRoute = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'GET /internal/management/ai_assistant_management_observability/connectors',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<FindActionResult[]> => {
    const { request, plugins } = resources;

    const actionsClient = await (
      await plugins.actions.start()
    ).getActionsClientWithRequest(request);

    const connectors = await actionsClient.getAll();

    return connectors.filter((connector) => connector.actionTypeId === '.gen-ai');
  },
});

export const connectorRoutes = {
  ...listConnectorsRoute,
};
