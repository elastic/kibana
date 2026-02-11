/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Extracts and parses JSON content from MCP tool result
 * @param result The CallToolResult from an MCP tool handler
 * @returns The parsed JSON object
 * @throws Error if content is not in expected format or JSON parsing fails
 */
export function parseToolResultJsonContent<T = any>(result: CallToolResult): T {
  if (!result.content || result.content.length === 0) {
    throw new Error('Tool result has no content');
  }

  const firstContent = result.content[0];

  if (!('type' in firstContent) || firstContent.type !== 'text') {
    throw new Error(`Expected content type 'text', got '${firstContent.type}'`);
  }

  if (!('text' in firstContent) || typeof firstContent.text !== 'string') {
    throw new Error('Content does not have text property or text is not a string');
  }

  try {
    return JSON.parse(firstContent.text) as T;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extracts the text content from MCP tool result
 * @param result The CallToolResult from an MCP tool handler
 * @returns The extracted text
 * @throws Error if content is not in expected format
 */
export function extractToolResultTextContent(result: CallToolResult): string {
  if (!result.content || result.content.length === 0) {
    throw new Error('Tool result has no content');
  }

  const firstContent = result.content[0];

  if (!('type' in firstContent) || firstContent.type !== 'text') {
    throw new Error(`Expected content type 'text', got '${firstContent.type}'`);
  }

  if (!('text' in firstContent) || typeof firstContent.text !== 'string') {
    throw new Error('Content does not have text property or text is not a string');
  }

  return firstContent.text as string;
}
