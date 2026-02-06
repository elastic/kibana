/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type http from 'http';
import type { ChatCompletionMessage } from 'openai/resources';

export type HttpRequest = http.IncomingMessage;
export type HttpResponse = http.ServerResponse<http.IncomingMessage>;

export type ToolMessage = Omit<ChatCompletionMessage, 'refusal'>;
export type LLMMessage = string | string[] | ToolMessage | undefined;

export interface LLmError {
  type: 'error';
  statusCode?: number;
  errorMsg: string;
}

export const isLlmError = (output: LLMMessage | LLmError): output is LLmError => {
  return Boolean(
    output && typeof output === 'object' && 'type' in output && output.type === 'error'
  );
};
