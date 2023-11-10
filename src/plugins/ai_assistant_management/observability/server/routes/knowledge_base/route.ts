/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { notImplemented } from '@hapi/boom';
import { createAIAssistantManagementObservabilityServerRoute } from '../create_ai_assistant_management_observability_server_route';

const getKnowledgeBaseStatus = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'GET /internal/management/ai_assistant_management_observability/kb_status',
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (
    resources
  ): Promise<{
    ready: boolean;
    error?: any;
    deployment_state?: string;
    allocation_state?: string;
  }> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    return await client.getKnowledgeBaseStatus();
  },
});

const setupKnowledgeBase = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'POST /internal/management/ai_assistant_management_observability/setup_kb',
  options: {
    tags: ['access:ai_assistant'],
    timeout: {
      idleSocket: 20 * 60 * 1000, // 20 minutes
    },
  },
  handler: async (resources): Promise<{}> => {
    const client = await resources.service.getClient({ request: resources.request });

    if (!client) {
      throw notImplemented();
    }

    await client.setupKnowledgeBase();

    return {};
  },
});

export const knowledgeBaseRoutes = {
  ...setupKnowledgeBase,
  ...getKnowledgeBaseStatus,
};
