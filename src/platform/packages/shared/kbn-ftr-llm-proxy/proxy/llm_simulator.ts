/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import type { ChatCompletionStreamParams } from 'openai/lib/ChatCompletionStream';
import type { ToolingLog } from '@kbn/tooling-log';
import { createOpenAiChunk, createOpenAIResponse } from './create_response';
import type { HttpResponse, LLMMessage, ToolMessage } from './types';

/**
 * Formats a chunk for Server-Sent Events (SSE)
 */
export function sseEvent(chunk: unknown) {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export class LlmSimulator {
  constructor(
    public readonly requestBody: ChatCompletionStreamParams,
    private readonly response: HttpResponse,
    private readonly log: ToolingLog,
    private readonly name: string,
    public readonly stream: boolean
  ) {}

  async writeChunk(msg: string | ToolMessage): Promise<void> {
    this.status(200);
    const chunk = createOpenAiChunk(msg);
    return this.write(sseEvent(chunk));
  }

  async complete(): Promise<void> {
    this.log.debug(`Completed intercept for "${this.name}"`);
    if (this.stream) {
      await this.write('data: [DONE]\n\n');
    }
    await this.end();
  }

  async writeResponse(message: LLMMessage): Promise<void> {
    this.status(200);
    await this.write(JSON.stringify(createOpenAIResponse(message)));
  }

  async writeError(code: number, error: Record<string, unknown>): Promise<void> {
    this.status(code);
    await this.write(this.stream ? sseEvent(error) : JSON.stringify(error));
    await this.end();
  }

  status = once((code: number) => {
    if (this.stream) {
      this.response.writeHead(code, {
        'Elastic-Interceptor': this.name.replace(/[^\x20-\x7E]/g, ' '), // Keeps only alphanumeric characters and spaces
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
    } else {
      this.response.writeHead(code, {
        'Elastic-Interceptor': this.name.replace(/[^\x20-\x7E]/g, ' '), // Keeps only alphanumeric characters and spaces
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
    }
  });

  private write(chunk: string): Promise<void> {
    return new Promise<void>((resolve) => this.response.write(chunk, () => resolve()));
  }

  private end(): Promise<void> {
    return new Promise<void>((resolve) => this.response.end(resolve));
  }
}
