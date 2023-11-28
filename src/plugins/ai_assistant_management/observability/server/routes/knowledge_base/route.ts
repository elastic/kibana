/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { notImplemented } from '@hapi/boom';
import { nonEmptyStringRt } from '@kbn/io-ts-utils';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { createAIAssistantManagementObservabilityServerRoute } from '../create_ai_assistant_management_observability_server_route';

const getKnowledgeBaseStatus = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'GET /internal/management/ai_assistant_management/observability/kb/status',
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
    const observabilityAIAssistantPlugin =
      await resources.plugins.observabilityAIAssistant?.start();

    if (!observabilityAIAssistantPlugin) {
      throw notImplemented();
    }

    const client = await observabilityAIAssistantPlugin.service.getClient({
      request: resources.request,
    });

    return client.getKnowledgeBaseStatus();
  },
});

const setupKnowledgeBase = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'POST /internal/management/ai_assistant_management/observability/setup',
  options: {
    tags: ['access:ai_assistant'],
    timeout: {
      idleSocket: 20 * 60 * 1000, // 20 minutes
    },
  },
  handler: async (resources): Promise<void> => {
    const observabilityAIAssistantPlugin =
      await resources.plugins.observabilityAIAssistant?.start();

    if (!observabilityAIAssistantPlugin) {
      throw notImplemented();
    }

    const client = await observabilityAIAssistantPlugin.service.getClient({
      request: resources.request,
    });

    return client.setupKnowledgeBase();
  },
});

const getKnowledgeBaseEntries = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'GET /internal/management/ai_assistant/observability/kb/entries',
  options: {
    tags: ['access:ai_assistant'],
  },
  params: t.type({
    query: t.union([
      t.type({
        query: t.string,
      }),
      t.undefined,
    ]),
  }),
  handler: async (
    resources
  ): Promise<{
    entries: KnowledgeBaseEntry[];
  }> => {
    const observabilityAIAssistantPlugin =
      await resources.plugins.observabilityAIAssistant?.start();

    if (!observabilityAIAssistantPlugin) {
      throw notImplemented();
    }

    const client = await observabilityAIAssistantPlugin.service.getClient({
      request: resources.request,
    });

    return client.getKnowledgeBaseEntries(resources.params.query?.query);
  },
});

const saveKnowledgeBaseEntry = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'POST /internal/management/ai_assistant/observability/kb/entries/save',
  params: t.type({
    body: t.type({
      id: t.string,
      text: nonEmptyStringRt,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const observabilityAIAssistantPlugin =
      await resources.plugins.observabilityAIAssistant?.start();

    if (!observabilityAIAssistantPlugin) {
      throw notImplemented();
    }

    const client = await observabilityAIAssistantPlugin.service.getClient({
      request: resources.request,
    });

    return await client.createKnowledgeBaseEntry({
      entry: {
        confidence: 'high',
        is_correction: false,
        public: true,
        labels: {
          type: 'manual',
          document_id: resources.params.body.id,
        },
        ...resources.params.body,
      },
    });
  },
});

const importKnowledgeBaseEntries = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'POST /internal/management/ai_assistant/observability/kb/entries/import',
  params: t.type({
    body: t.type({
      entries: t.array(
        t.type({
          id: t.string,
          text: nonEmptyStringRt,
        })
      ),
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const observabilityAIAssistantPlugin =
      await resources.plugins.observabilityAIAssistant?.start();

    if (!observabilityAIAssistantPlugin) {
      throw notImplemented();
    }

    const client = await observabilityAIAssistantPlugin.service.getClient({
      request: resources.request,
    });

    const entries = resources.params.body.entries.map((entry) => ({
      confidence: 'high' as KnowledgeBaseEntry['confidence'],
      is_correction: false,
      public: true,
      labels: {
        type: 'manual',
        document_id: entry.id,
      },
      ...entry,
    }));

    return await client.importKnowledgeBaseEntries({ entries });
  },
});

const deleteKnowledgeBaseEntry = createAIAssistantManagementObservabilityServerRoute({
  endpoint: 'DELETE /internal/management/ai_assistant/observability/kb/entries/{entryId}',
  params: t.type({
    path: t.type({
      entryId: t.string,
    }),
  }),
  options: {
    tags: ['access:ai_assistant'],
  },
  handler: async (resources): Promise<void> => {
    const observabilityAIAssistantPlugin =
      await resources.plugins.observabilityAIAssistant?.start();

    if (!observabilityAIAssistantPlugin) {
      throw notImplemented();
    }

    const client = await observabilityAIAssistantPlugin.service.getClient({
      request: resources.request,
    });

    return await client.deleteKnowledgeBaseEntry(resources.params.path.entryId);
  },
});

export const knowledgeBaseRoutes = {
  ...setupKnowledgeBase,
  ...getKnowledgeBaseStatus,
  ...getKnowledgeBaseEntries,
  ...importKnowledgeBaseEntries,
  ...saveKnowledgeBaseEntry,
  ...deleteKnowledgeBaseEntry,
};
