/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GenAiMessage } from './get_genai_fields';
import { isRecord, parseNestedJson, unwrapToolResponse } from './parse_genai_value';

export interface GenAiTextBlock {
  type: 'text';
  content: string;
}

export interface GenAiToolCallBlock {
  type: 'tool_call';
  id?: string;
  name?: string;
  arguments?: unknown;
}

export interface GenAiToolResponseBlock {
  type: 'tool_call_response';
  id?: string;
  response?: unknown;
}

export interface GenAiUnknownBlock {
  type: 'unknown';
  value: unknown;
}

export type GenAiMessageBlock =
  | GenAiTextBlock
  | GenAiToolCallBlock
  | GenAiToolResponseBlock
  | GenAiUnknownBlock;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const toPartBlock = (part: unknown): GenAiMessageBlock => {
  if (!isRecord(part)) return { type: 'unknown', value: part };

  const { type } = part;
  if (type === 'text') {
    return { type: 'text', content: typeof part.content === 'string' ? part.content : '' };
  }
  if (type === 'tool_call') {
    return {
      type: 'tool_call',
      id: asString(part.id),
      name: asString(part.name),
      arguments: parseNestedJson(part.arguments),
    };
  }
  if (type === 'tool_call_response') {
    return {
      type: 'tool_call_response',
      id: asString(part.id),
      response: unwrapToolResponse(part.response),
    };
  }
  return { type: 'unknown', value: part };
};

/** Converts an OpenAI-style `tool_calls` entry (`{ id, function: { name, arguments } }`). */
const toLegacyToolCallBlock = (toolCall: unknown): GenAiMessageBlock => {
  if (!isRecord(toolCall)) return { type: 'unknown', value: toolCall };

  const fn = isRecord(toolCall.function) ? toolCall.function : toolCall;
  return {
    type: 'tool_call',
    id: asString(toolCall.id),
    name: asString(fn.name),
    arguments: parseNestedJson(fn.arguments ?? fn.args),
  };
};

const getLegacyBlocks = (message: GenAiMessage): GenAiMessageBlock[] => {
  const { content, tool_calls: toolCalls, tool_call_id: toolCallId } = message;
  const blocks: GenAiMessageBlock[] = [];

  if (message.role === 'tool' && content != null) {
    blocks.push({
      type: 'tool_call_response',
      id: asString(toolCallId),
      response: unwrapToolResponse(content),
    });
  } else if (typeof content === 'string') {
    if (content.length > 0) blocks.push({ type: 'text', content });
  } else if (content != null) {
    blocks.push({ type: 'unknown', value: content });
  }

  if (Array.isArray(toolCalls)) {
    blocks.push(...toolCalls.map(toLegacyToolCallBlock));
  }

  if (blocks.length === 0 && content == null) {
    blocks.push({ type: 'unknown', value: message });
  }
  return blocks;
};

/**
 * Normalizes a message into renderable blocks, supporting both the OTel `parts`
 * schema and the legacy `content` / `tool_calls` / `tool_call_id` schema.
 */
export const getMessageBlocks = (message: GenAiMessage): GenAiMessageBlock[] =>
  Array.isArray(message.parts) && message.parts.length > 0
    ? message.parts.map(toPartBlock)
    : getLegacyBlocks(message);

/** Maps tool call IDs to tool names so tool responses can be labelled with the tool that ran. */
export const getToolNamesById = (messages: GenAiMessage[]): Map<string, string> => {
  const namesById = new Map<string, string>();
  messages.forEach((message) => {
    getMessageBlocks(message).forEach((block) => {
      if (block.type === 'tool_call' && block.id && block.name) {
        namesById.set(block.id, block.name);
      }
    });
  });
  return namesById;
};
