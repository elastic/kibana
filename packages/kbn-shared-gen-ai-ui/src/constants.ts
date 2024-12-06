/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum ServiceProviderKeys {
  amazonbedrock = 'amazonbedrock',
  azureopenai = 'azureopenai',
  azureaistudio = 'azureaistudio',
  cohere = 'cohere',
  elasticsearch = 'elasticsearch',
  googleaistudio = 'googleaistudio',
  googlevertexai = 'googlevertexai',
  hugging_face = 'hugging_face',
  mistral = 'mistral',
  openai = 'openai',
  anthropic = 'anthropic',
  watsonxai = 'watsonxai',
  'alibabacloud-ai-search' = 'alibabacloud-ai-search',
}

export const INTERNAL_BASE_GEN_AI_API_PATH = '/internal/gen_ai';

export enum SUB_ACTION {
  COMPLETION = 'completion',
  RERANK = 'rerank',
  TEXT_EMBEDDING = 'text_embedding',
  SPARSE_EMBEDDING = 'sparse_embedding',
  COMPLETION_STREAM = 'completion_stream',
}
export const DEFAULT_CHAT_COMPLETE_BODY = {
  input: 'What is Elastic?',
};

export const DEFAULT_RERANK_BODY = {
  input: ['luke', 'like', 'leia', 'chewy', 'r2d2', 'star', 'wars'],
  query: 'star wars main character',
};

export const DEFAULT_SPARSE_EMBEDDING_BODY = {
  input: 'The sky above the port was the color of television tuned to a dead channel.',
};

export const DEFAULT_TEXT_EMBEDDING_BODY = {
  input: 'The sky above the port was the color of television tuned to a dead channel.',
  inputType: 'ingest',
};

export const DEFAULTS_BY_TASK_TYPE: Record<string, unknown> = {
  [SUB_ACTION.COMPLETION]: DEFAULT_CHAT_COMPLETE_BODY,
  [SUB_ACTION.RERANK]: DEFAULT_RERANK_BODY,
  [SUB_ACTION.SPARSE_EMBEDDING]: DEFAULT_SPARSE_EMBEDDING_BODY,
  [SUB_ACTION.TEXT_EMBEDDING]: DEFAULT_TEXT_EMBEDDING_BODY,
};

export const DEFAULT_TASK_TYPE = 'completion';

export const DEFAULT_PROVIDER = 'elasticsearch';
