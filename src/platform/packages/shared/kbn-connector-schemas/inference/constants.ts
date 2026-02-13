/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.inference';
export const CONNECTOR_NAME = i18n.translate('connectors.inference.title', {
  defaultMessage: 'AI Connector',
});

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
  elastic = 'elastic',
}

export enum SUB_ACTION {
  UNIFIED_COMPLETION_ASYNC_ITERATOR = 'unified_completion_async_iterator',
  UNIFIED_COMPLETION_STREAM = 'unified_completion_stream',
  UNIFIED_COMPLETION = 'unified_completion',
  COMPLETION = 'completion',
  RERANK = 'rerank',
  TEXT_EMBEDDING = 'text_embedding',
  SPARSE_EMBEDDING = 'sparse_embedding',
  COMPLETION_STREAM = 'completion_stream',
}

/**
 * Mapping of sub_action to task_type for inference connectors.
 * This maps each executable sub-action to its corresponding inference endpoint task type.
 */
export const TASK_TYPE_BY_SUB_ACTION: Record<SUB_ACTION, string> = {
  [SUB_ACTION.UNIFIED_COMPLETION]: 'chat_completion',
  [SUB_ACTION.UNIFIED_COMPLETION_STREAM]: 'chat_completion',
  [SUB_ACTION.UNIFIED_COMPLETION_ASYNC_ITERATOR]: 'chat_completion',
  [SUB_ACTION.COMPLETION]: 'completion',
  [SUB_ACTION.COMPLETION_STREAM]: 'completion',
  [SUB_ACTION.RERANK]: 'rerank',
  [SUB_ACTION.TEXT_EMBEDDING]: 'text_embedding',
  [SUB_ACTION.SPARSE_EMBEDDING]: 'sparse_embedding',
};

export const DEFAULT_PROVIDER = 'openai';
export const DEFAULT_TASK_TYPE = 'completion';
