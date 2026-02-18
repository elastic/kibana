/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';

export function createToolCallMessage(
  toolName: string,
  toolArg: Record<string, any>
): Omit<ChatCompletionMessage, 'refusal'> {
  return {
    role: 'assistant' as const,
    content: '',
    tool_calls: [
      {
        function: {
          name: toolName,
          arguments: JSON.stringify(toolArg),
        },
        id: `call_${uuidv4()}`,
        type: 'function',
      },
    ],
  };
}
