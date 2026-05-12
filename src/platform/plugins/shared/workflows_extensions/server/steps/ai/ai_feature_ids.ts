/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKFLOWS_AI_PARENT_FEATURE_ID = 'workflows_ai';
export const AI_PROMPT_FEATURE_ID = 'ai.prompt';
export const AI_SUMMARIZE_FEATURE_ID = 'ai.summarize';
export const AI_CLASSIFY_FEATURE_ID = 'ai.classify';

/**
 * Recommended inference endpoints for Workflows AI steps.
 * Mirrors the Agent Builder recommended endpoint list.
 */
export const WORKFLOWS_AI_RECOMMENDED_ENDPOINTS = [
  '.anthropic-claude-4.6-sonnet-chat_completion',
  '.anthropic-claude-4.6-opus-chat_completion',
  '.openai-gpt-5.2-chat_completion',
];
