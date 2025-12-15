/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import type OpenAI from 'openai';
import type { ToolMessage } from './types';

export function createOpenAiChunk(msg: string | ToolMessage): OpenAI.ChatCompletionChunk {
  let delta: OpenAI.ChatCompletionChunk.Choice.Delta;
  if (typeof msg === 'string') {
    delta = { role: 'user', content: msg };
  } else {
    delta = {
      role: msg.role,
      content: msg.content,
      tool_calls: msg.tool_calls?.map((tc) => ({ ...tc, index: 0 })),
    };
  }

  return {
    id: v4(),
    object: 'chat.completion.chunk',
    created: 0,
    model: 'gpt-4',
    choices: [
      {
        delta,
        index: 0,
        finish_reason: null,
      },
    ],
  };
}
