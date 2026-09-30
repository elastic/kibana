/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from './types';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Pointers come from agent-generated documents, so a segment that would reach
 * the prototype chain is rejected rather than sanitised — a silently rewritten
 * path would bind the UI to the wrong data.
 */
export class UnsafePointerError extends Error {
  constructor(pointer: string, segment: string) {
    super(`Refusing to resolve JSON pointer "${pointer}": unsafe segment "${segment}"`);
    this.name = 'UnsafePointerError';
  }
}

/** Parses an RFC 6901 pointer into its decoded segments. */
export function parsePointer(pointer: string): string[] {
  if (pointer === '' || pointer === '/') return [];
  const raw = pointer.startsWith('/') ? pointer.slice(1) : pointer;
  return raw.split('/').map((segment) => {
    const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    if (FORBIDDEN_KEYS.has(decoded)) throw new UnsafePointerError(pointer, decoded);
    return decoded;
  });
}

export function getPointer(root: JsonValue | undefined, pointer: string): JsonValue | undefined {
  let current = root;
  for (const segment of parsePointer(pointer)) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, JsonValue>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Immutably sets `value` at `pointer`, cloning only the nodes along the path.
 * Setting `null` deletes the key, per the A2UI updateDataModel semantics.
 */
export function setPointer(
  root: JsonValue | undefined,
  pointer: string,
  value: JsonValue
): JsonValue {
  const segments = parsePointer(pointer);
  if (segments.length === 0) return value;

  const cloneNode = (node: JsonValue | undefined, key: string): JsonValue => {
    if (Array.isArray(node)) return [...node];
    if (node !== null && typeof node === 'object') return { ...(node as object) } as JsonValue;
    // A numeric segment implies the missing container is an array.
    return Number.isInteger(Number(key)) ? [] : {};
  };

  const next = cloneNode(root, segments[0]);
  let cursor: JsonValue = next;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const child = cloneNode(
      (cursor as Record<string, JsonValue>)[segment] as JsonValue | undefined,
      segments[i + 1]
    );
    (cursor as Record<string, JsonValue>)[segment] = child;
    cursor = child;
  }

  const last = segments[segments.length - 1];
  const container = cursor as Record<string, JsonValue>;
  if (value === null) {
    if (Array.isArray(cursor)) cursor.splice(Number(last), 1);
    else delete container[last];
  } else if (Array.isArray(cursor) && last === '-') {
    cursor.push(value);
  } else {
    container[last] = value;
  }

  return next;
}
