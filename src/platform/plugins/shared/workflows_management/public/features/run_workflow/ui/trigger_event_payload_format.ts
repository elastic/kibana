/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PAYLOAD_COMPACT_MAX_CHARS = 500;

export function isTriggerEventPayloadEmpty(payload: unknown): boolean {
  if (payload === undefined || payload === null) {
    return true;
  }
  return (
    typeof payload === 'object' && !Array.isArray(payload) && Object.keys(payload).length === 0
  );
}

/** Clipboard / copy action: compact JSON, full payload. */
export function formatTriggerEventPayloadForCopy(payload: unknown): string {
  if (payload === undefined) {
    return '';
  }
  if (payload === null) {
    return 'null';
  }
  if (typeof payload === 'object') {
    return JSON.stringify(payload);
  }
  return String(payload);
}

/** Expanded cell / code-block preview: pretty-printed JSON, full payload. */
export function formatTriggerEventPayloadPreview(payload: unknown): string {
  if (payload === undefined) {
    return '';
  }
  if (payload === null) {
    return 'null';
  }
  if (typeof payload === 'object') {
    return JSON.stringify(payload, null, 2);
  }
  return String(payload);
}

/** Summary column, flattened fields, search text, etc.: compact JSON truncated at {@link PAYLOAD_COMPACT_MAX_CHARS}. */
export function buildTriggerEventPayloadCompactText(
  payload: unknown,
  maxChars: number = PAYLOAD_COMPACT_MAX_CHARS
): { text: string; isEmpty: boolean } {
  if (isTriggerEventPayloadEmpty(payload)) {
    return { text: '', isEmpty: true };
  }
  const json = formatTriggerEventPayloadForCopy(payload);
  const text = json.length > maxChars ? `${json.slice(0, maxChars)}…` : json;
  return { text, isEmpty: false };
}
