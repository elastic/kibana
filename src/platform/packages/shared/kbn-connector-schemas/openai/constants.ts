/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.gen-ai';
export const CONNECTOR_NAME = i18n.translate('connectors.genAi.title', {
  defaultMessage: 'OpenAI',
});

export enum SUB_ACTION {
  RUN = 'run',
  INVOKE_AI = 'invokeAI',
  INVOKE_STREAM = 'invokeStream',
  INVOKE_ASYNC_ITERATOR = 'invokeAsyncIterator',
  STREAM = 'stream',
  DASHBOARD = 'getDashboard',
  TEST = 'test',
}

export enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
  Other = 'Other',
}

export const DEFAULT_TIMEOUT_MS = 120000;

export const DEFAULT_MODEL = 'gpt-4.1';

export const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions' as const;
export const OPENAI_LEGACY_COMPLETION_URL = 'https://api.openai.com/v1/completions' as const;
export const AZURE_OPENAI_CHAT_URL =
  '/openai/deployments/{deployment-id}/chat/completions?api-version={api-version}' as const;
export const AZURE_OPENAI_COMPLETIONS_URL =
  '/openai/deployments/{deployment-id}/completions?api-version={api-version}' as const;
export const AZURE_OPENAI_COMPLETIONS_EXTENSIONS_URL =
  '/openai/deployments/{deployment-id}/extensions/chat/completions?api-version={api-version}' as const;
