/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  type ObservabilityAIAssistantPluginStart,
  type ObservabilityAIAssistantChatService,
} from '@kbn/observability-ai-assistant-plugin/public';

// should be moved to a package
enum ChatState {
  Ready = 'ready',
  Loading = 'loading',
  Error = 'error',
  Aborted = 'aborted',
}

export function getAiService(
  observabilityAIAssistant: ObservabilityAIAssistantPluginStart,
  chatService: ObservabilityAIAssistantChatService
) {
  const aiConnectors = observabilityAIAssistant.useGenAIConnectors();
  const chatServiceResult = observabilityAIAssistant.useChat({
    chatService,
    connectorId: aiConnectors?.selectedConnector,
    initialMessages: [],
    persist: false,
  });

  const isLoading = Boolean(aiConnectors.loading || chatServiceResult.state === ChatState.Loading);

  return {
    ...chatServiceResult,
    isLoading,
  };
}
