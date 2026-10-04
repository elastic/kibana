/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Bounds how many layers of JSON-encoded strings are decoded within one value.
const MAX_STRING_PARSE_DEPTH = 4;

// Agent Builder wraps tool output in a <tool_result> envelope (escaping any
// nested closing tag) so the model can tell retrieved content from instructions.
const TOOL_RESULT_ENVELOPE = /^\s*<tool_result>([\s\S]*)<\/tool_result>\s*$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const tryParseJson = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const stripToolResultEnvelope = (value: string): string => {
  const match = value.match(TOOL_RESULT_ENVELOPE);
  return match ? match[1].replace(/<\\(\/tool_result\s*>)/gi, '<$1') : value;
};

/** Parses a value that may be a JSON-encoded string, including JSON nested inside string fields. */
export const parseNestedJson = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') {
    if (depth >= MAX_STRING_PARSE_DEPTH) return value;
    const parsed = tryParseJson(value);
    return parsed === value ? value : parseNestedJson(parsed, depth + 1);
  }
  if (Array.isArray(value)) return value.map((item) => parseNestedJson(item, depth));
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, parseNestedJson(item, depth)])
    );
  }
  return value;
};

/**
 * Unwraps a tool response for display: parses JSON-encoded strings, drops the
 * single-key `{ response }` wrapper and strips the `<tool_result>` envelope.
 */
export const unwrapToolResponse = (response: unknown): unknown => {
  let value = typeof response === 'string' ? tryParseJson(response) : response;

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === 'response') {
      value = value.response;
    }
  }
  if (typeof value === 'string') {
    value = stripToolResultEnvelope(value);
  }
  return parseNestedJson(value);
};
