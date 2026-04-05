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
  dynamicKey: string;
  suffixPath: string | null;
}

export interface ParsedVariablePath {
  errors?: string[];
  propertyPath: string | null;
  filters: string[];
  hasDynamicBracketAccess?: boolean;
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
      };
    }

    const propertyAccessToken = getPropertyAccessToken(filtered);
    if (!propertyAccessToken) {
      return {
        errors: [`Invalid property path: ${trimmedPath}`],
        propertyPath: null,
        filters: [],
      };
    }

    const { props } = propertyAccessToken;
    const filters = filtered.filters.map((f) => f.getText().trim());
    const propertyPath = propertyAccessToken.getText();
    const hasDynamicBracketAccess = containsDynamicAccess(props);
    const dynamicAccess = hasDynamicBracketAccess ? extractFirstDynamicAccess(props) : undefined;

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
    };
  }
}

function getPropertyAccessToken(
  filtered: ReturnType<Tokenizer['readFilteredValue']>
): PropertyAccessToken | null {
  const first = filtered.initial.postfix[0];
  if (first && first.kind === TokenKind.PropertyAccess) {
    return first as PropertyAccessToken;
  }
  return null;
}

function containsDynamicAccess(props: Token[]): boolean {
  return props.some((prop) => prop.kind === TokenKind.PropertyAccess);
}

function extractFirstDynamicAccess(props: Token[]): DynamicBracketAccessInfo | undefined {
  const dynamicIdx = props.findIndex((p) => p.kind === TokenKind.PropertyAccess);
  if (dynamicIdx === -1) return undefined;

  const prefixProps = props.slice(0, dynamicIdx);
  const suffixProps = props.slice(dynamicIdx + 1);
  const dynamicProp = props[dynamicIdx] as PropertyAccessToken;

  return {
    prefixPath: propsToPathString(prefixProps),
    dynamicKey: dynamicProp.getText(),
    suffixPath: suffixProps.length > 0 ? propsToPathString(suffixProps) : null,
  };
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
