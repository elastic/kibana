/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type PropertyAccessToken, type Token, Tokenizer, TokenKind } from 'liquidjs';

export interface DynamicBracketAccessInfo {
  prefixPath: string;
  dynamicKeys: string[];
}

export interface ParsedVariablePath {
  errors?: string[];
  propertyPath: string | null;
  filters: string[];
  hasDynamicBracketAccess: boolean;
  dynamicAccess?: DynamicBracketAccessInfo;
}

/**
 * Checks whether a string is a valid property path (no filters).
 * Used by autocomplete to decide between dot-access and bracket-access suggestions.
 */
export function isValidPropertyPath(path: string): boolean {
  try {
    const tokenizer = new Tokenizer(path);
    const value = tokenizer.readValue();
    if (!value || value.kind !== TokenKind.PropertyAccess) return false;
    if (!tokenizer.end()) return false;
    return true;
  } catch {
    return false;
  }
}

export function validateVariablePath(path: string): boolean {
  const parsed = parseVariablePath(path);
  return parsed !== null && !parsed.errors;
}

/**
 * Parses a variable expression including its Liquid filters (e.g. `| entries`) into
 * its property path and filters, which are needed for semantic validation like item type resolution.
 * Returns null for empty input, or an object with errors for invalid syntax.
 */
export function parseVariablePath(path: string): ParsedVariablePath | null {
  const trimmedPath = path.trim();
  if (trimmedPath.length === 0) return null;

  try {
    const tokenizer = new Tokenizer(trimmedPath);
    const filtered = tokenizer.readFilteredValue();

    if (!tokenizer.end()) {
      return {
        errors: [`Invalid property path: ${trimmedPath}`],
        propertyPath: null,
        filters: [],
        hasDynamicBracketAccess: false,
      };
    }

    const propertyAccessToken = getPropertyAccessToken(filtered);
    if (!propertyAccessToken) {
      return {
        errors: [`Invalid property path: ${trimmedPath}`],
        propertyPath: null,
        filters: [],
        hasDynamicBracketAccess: false,
      };
    }

    const { props } = propertyAccessToken;
    const filters = filtered.filters.map((f) => f.getText().trim());
    const propertyPath = propertyAccessToken.getText();
    const hasDynamicBracketAccess = containsDynamicAccess(props);
    const dynamicAccess = hasDynamicBracketAccess ? extractDynamicAccess(props) : undefined;

    return {
      propertyPath,
      filters,
      hasDynamicBracketAccess,
      dynamicAccess,
    };
  } catch {
    return {
      errors: [`Invalid property path: ${trimmedPath}`],
      propertyPath: null,
      filters: [],
      hasDynamicBracketAccess: false,
    };
  }
}

/**
 * Extracts the single PropertyAccessToken from a parsed Liquid filtered-value,
 * applying guards against inputs that LiquidJS would partially accept but are
 * not valid single variable paths.
 *
 * Returns null when:
 * - The expression contains multiple space-separated identifiers (e.g. `a b`)
 * - The root token is not a PropertyAccess (e.g. a bare number or quoted string)
 * - The path has no property segments (e.g. empty brackets `[]`)
 * - The first segment is not a word identifier (e.g. `["foo"]` or `[0]`)
 * - Any word segment resolved to an empty string (malformed input)
 */
function getPropertyAccessToken(
  filtered: ReturnType<Tokenizer['readFilteredValue']>
): PropertyAccessToken | null {
  if (filtered.initial.postfix.length !== 1) return null;
  const first = filtered.initial.postfix[0];
  if (!first || first.kind !== TokenKind.PropertyAccess) return null;
  const token = first as PropertyAccessToken;
  if (token.props.length === 0) return null;
  if (token.props[0].kind !== TokenKind.Word) return null;
  if (token.props.some((p) => p.kind === TokenKind.Word && p.getText() === '')) return null;
  return token;
}

function containsDynamicAccess(props: Token[]): boolean {
  return props.some((prop) => prop.kind === TokenKind.PropertyAccess);
}

function extractDynamicAccess(props: Token[]): DynamicBracketAccessInfo | undefined {
  const firstDynamicIdx = props.findIndex((p) => p.kind === TokenKind.PropertyAccess);
  if (firstDynamicIdx === -1) return undefined;

  const prefixProps = props.slice(0, firstDynamicIdx);
  const dynamicKeys = collectDynamicKeys(props);

  return {
    prefixPath: propsToPathString(prefixProps),
    dynamicKeys,
  };
}

/**
 * Recursively collects every statically-resolvable path inside dynamic bracket
 * accesses so that each one can be validated against the context schema.
 *
 * For a nested expression like `inputs.index[index.x]` the function emits
 * both the intermediate prefix (`inputs.index`) and the leaf key (`index.x`).
 *
 * Example — `context.items[inputs.index[index.x]]`:
 *   → `['inputs.index', 'index.x']`
 *
 * Example — `a[b].x[c[d]].y`:
 *   → `['b', 'c', 'd']`
 */
function collectDynamicKeys(props: Token[]): string[] {
  const keys: string[] = [];
  for (const prop of props) {
    if (prop.kind === TokenKind.PropertyAccess) {
      const nested = prop as PropertyAccessToken;
      const nestedFirstDynIdx = nested.props.findIndex((p) => p.kind === TokenKind.PropertyAccess);
      if (nestedFirstDynIdx !== -1) {
        const nestedPrefix = propsToPathString(nested.props.slice(0, nestedFirstDynIdx));
        if (nestedPrefix) {
          keys.push(nestedPrefix);
        }
        keys.push(...collectDynamicKeys(nested.props));
      } else {
        keys.push(propsToPathString(nested.props));
      }
    }
  }
  return keys;
}

function propsToPathString(props: Token[]): string {
  return props
    .map((prop, i) => {
      if (prop.kind === TokenKind.Word) {
        const text = prop.getText();
        return i === 0 ? text : `.${text}`;
      }
      if (prop.kind === TokenKind.Number) {
        return `[${prop.getText()}]`;
      }
      if (prop.kind === TokenKind.Quoted) {
        return `[${prop.getText()}]`;
      }
      if (prop.kind === TokenKind.PropertyAccess) {
        return `[${prop.getText()}]`;
      }
      return prop.getText();
    })
    .join('');
}
