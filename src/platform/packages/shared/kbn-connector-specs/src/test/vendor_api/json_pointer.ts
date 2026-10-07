/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type JsonObject = Record<string, unknown>;

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Splits a JSON pointer (RFC 6901) such as `/components/schemas/Pet` into its tokens. */
export const toTokens = (pointer: string): string[] =>
  pointer === ''
    ? []
    : pointer
        .slice(1)
        .split('/')
        .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));

export const toPointer = (tokens: readonly string[]): string =>
  tokens.map((token) => `/${token.replace(/~/g, '~0').replace(/\//g, '~1')}`).join('');

/** The pointer of a local `$ref` such as `#/components/schemas/Pet`, URI-decoded. */
export const localRefToPointer = (ref: string): string | undefined =>
  ref.startsWith('#') ? decodeURIComponent(ref.slice(1)) : undefined;

export const getAtTokens = (document: unknown, tokens: readonly string[]): unknown =>
  tokens.reduce<unknown>(
    (node, token) =>
      Array.isArray(node) ? node[Number(token)] : isJsonObject(node) ? node[token] : undefined,
    document
  );

/** Sets a value in an object tree, creating intermediate objects. */
export const setAtTokens = (document: JsonObject, tokens: readonly string[], value: unknown) => {
  let node = document;
  for (const token of tokens.slice(0, -1)) {
    const next = node[token];
    node[token] = isJsonObject(next) ? next : {};
    node = node[token] as JsonObject;
  }
  node[tokens[tokens.length - 1]] = value;
};

/** Calls `visit` with every `$ref` string in a tree, depth first. */
export const forEachRef = (value: unknown, visit: (ref: string) => void): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => forEachRef(item, visit));
  } else if (isJsonObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string') {
        visit(child);
      } else {
        forEachRef(child, visit);
      }
    }
  }
};
