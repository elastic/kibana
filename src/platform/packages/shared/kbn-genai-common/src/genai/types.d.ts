/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GEN_AI_MESSAGE_ROLES } from './constants';
export type GenAiMessageRole = (typeof GEN_AI_MESSAGE_ROLES)[keyof typeof GEN_AI_MESSAGE_ROLES];
export interface GenAiMessage {
  role: GenAiMessageRole | (string & {});
  content?: string;
  parts?: Array<{
    type: string;
    content?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}
export interface GenAiFields {
  operationName?: string;
  requestModel?: string;
  responseModel?: string;
  provider?: string;
  system?: string;
  inputTokens?: number;
  outputTokens?: number;
  conversationId?: string;
  requestParams: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
    seed?: number;
  };
  response: {
    id?: string;
    finish_reasons?: string[];
  };
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
  toolDefinitions?: unknown;
  toolName?: string;
  toolCallArguments?: unknown;
  toolCallResult?: unknown;
}
