/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';

export function lowerCaseFirstLetter(str: string) {
  if (isUpperCase(str)) return str.toLowerCase();

  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function upperCaseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isTruthy<T>(value: T): value is NonNullable<T> {
  return value != null;
}

function isUpperCase(val: string) {
  return /^[A-Z]+$/.test(val);
}

export function geti18nIdentifierFromString(str: string) {
  return str
    .trim()
    .replace(/```\w*```/g, '')
    .replace(/[\'\"]+/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter((_, i) => i <= 3)
    .map(upperCaseFirstLetter)
    .map((word, index) => (index === 0 ? word.toLowerCase() : word))
    .join('')
    .replace(/[^a-zA-Z\s]*/g, '');
}

export function getTranslatableValueFromString(str: string) {
  const strTrimmed = str.trim();

  if (strTrimmed.length === 1) {
    return '';
  }

  // Markdown
  if (strTrimmed.replace(/```\w*```/g, '').length === 0) {
    return '';
  }

  // Special characters, numbers, and white spaces
  if (strTrimmed.replace(/[!\@\#\$\%\^\&\*\(\)\_\+\{\}\|]|[0-9]|\s+/g, '').length === 0) {
    return '';
  }

  return strTrimmed.replace(/'/g, "\\'");
}

/**
 * Helper to extract a string value from a node if it's a string Literal
 */
export function getStringValue(node: TSESTree.Node): string | false {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  return false;
}

/**
 * Extract translatable string value from a JSX attribute value.
 * Handles both label="foo" and label={'foo'} patterns.
 */
export function getValueFromJSXAttribute(attrValue: TSESTree.JSXAttribute['value']): string {
  if (!attrValue) return '';

  // label="foo" - direct string literal
  if (attrValue.type === AST_NODE_TYPES.Literal && typeof attrValue.value === 'string') {
    return getTranslatableValueFromString(attrValue.value);
  }

  // label={'foo'} - expression container with string literal
  if (
    attrValue.type === AST_NODE_TYPES.JSXExpressionContainer &&
    attrValue.expression.type === AST_NODE_TYPES.Literal &&
    typeof attrValue.expression.value === 'string'
  ) {
    return getTranslatableValueFromString(attrValue.expression.value);
  }

  return '';
}
