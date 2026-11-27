/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from './schema_walk';
import type { OpenApiDocument } from './types';

const MAX_REF_HOPS = 32;

/** Appends property names to a JSON pointer, escaping `~` and `/`. */
export const appendPointer = (pointer: string, ...tokens: Array<string | number>): string =>
  tokens.reduce<string>(
    (result, token) => `${result}/${String(token).replace(/~/g, '~0').replace(/\//g, '~1')}`,
    pointer
  );

/** Returns the value a JSON pointer such as `/components/schemas/Item` points at. */
export const getAtPointer = (document: OpenApiDocument, pointer: string): unknown =>
  pointer
    .split('/')
    .slice(1)
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>(
      (node, token) =>
        isRecord(node) ? node[token] : Array.isArray(node) ? node[Number(token)] : undefined,
      document
    );

/** Converts a `$ref` within the document, such as `#/components/schemas/Item`, to a pointer. */
export const refToPointer = (ref: string): string => {
  if (!ref.startsWith('#')) {
    throw new Error(`External $ref ${ref} is not supported; bundle the spec into one document`);
  }
  return decodeURIComponent(ref.slice(1));
};

/**
 * Follows `$ref`s from a node until it reaches an object without one, and returns that object
 * with its pointer. Used for parameters, request bodies, responses and headers.
 */
export const resolveObject = (
  document: OpenApiDocument,
  node: unknown,
  pointer: string
): { value: Record<string, unknown>; pointer: string } => {
  let current = node;
  let currentPointer = pointer;
  for (let hop = 0; isRecord(current) && typeof current.$ref === 'string'; hop++) {
    if (hop === MAX_REF_HOPS) {
      throw new Error(`$ref cycle at ${pointer}`);
    }
    currentPointer = refToPointer(current.$ref);
    current = getAtPointer(document, currentPointer);
  }
  if (!isRecord(current)) {
    throw new Error(`Unresolvable $ref at ${pointer}`);
  }
  return { value: current, pointer: currentPointer };
};
