/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useAIAssistChat } from './useAIAssistChat';
import { AIPlaygroundPluginStartDeps, UseChatHelpers } from '../../types';

export const useChat = (): UseChatHelpers => {
  const { services } = useKibana<AIPlaygroundPluginStartDeps>();

  const chatHelpers = useAIAssistChat({
    api: async (request: RequestInit) => {
      const response = await services.http.post('/internal/enterprise_search/ai_playground/chat', {
        ...request,
        rawResponse: true,
        asResponse: true,
      });

      return response.response!;
    },
  });

  return chatHelpers;
};
