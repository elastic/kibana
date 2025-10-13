/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ESQLFunction,
  ESQLList,
  ESQLUnknownItem,
  ESQLSingleAstItem,
} from '../../../../../../types';
import type { PartialOperatorDetection } from '../../types';
import { endsWithInOrNotInToken, endsWithIsOrIsNotToken, endsWithLikeOrRlikeToken } from '../utils';
import { Builder } from '../../../../../../builder';

const TRAILING_NON_WORD_REGEX = /\W+$/;
const NOT_LIKE_REGEX = /\bnot\s+like\s*$/i;
const NOT_IN_REGEX = /\bnot\s+in\s*$/i;

// Regex to extract field name before operator: match[1] = fieldName
// Matches with or without opening parenthesis
const FIELD_BEFORE_IN_REGEX = /(\w+)\s+(?:not\s+)?in\s*\(?\s*$/i;
const FIELD_BEFORE_LIKE_REGEX = /(\w+)\s+(?:not\s+)?(?:r)?like\s*\(?\s*$/i;

// ============================================================================
// Synthetic Node Creation Functions
// ============================================================================

/**
 * Creates a synthetic binary expression node for IN / NOT IN operators.
 * Used when cursor is right after "field IN " or "field IN (".
 * If innerText ends with "(", creates a list node instead of placeholder.
 */
export function createSyntheticListOperatorNode(
  operatorName: string,
  innerText: string,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction {
  const textLength = innerText.length;
  const hasOpenParen = /\(\s*$/.test(innerText);

  const right = hasOpenParen ? createEmptyListNode(textLength) : createPlaceholderNode(textLength);

  // Extract field name from text if leftOperand is not provided or not a column
  const left = leftOperand ?? extractFieldFromText(innerText, FIELD_BEFORE_IN_REGEX);

  return {
    type: 'function',
    name: operatorName,
    subtype: 'binary-expression',
    args: [left ?? createPlaceholderNode(0), right],
    incomplete: true,
    location: { min: textLength, max: textLength },
    text: operatorName,
  };
}

/**
 * Creates a synthetic binary expression node for LIKE / NOT LIKE operators.
 * Used when cursor is right after "field LIKE " or "field LIKE (".
 * If innerText ends with "(", creates a list node instead of placeholder.
 */
export function createSyntheticLikeOperatorNode(
  operatorName: string,
  innerText: string,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction {
  const textLength = innerText.length;
  const hasOpenParen = /\(\s*$/.test(innerText);

  const right = hasOpenParen ? createEmptyListNode(textLength) : createPlaceholderNode(textLength);

  // Extract field name from text if leftOperand is not provided or not a column
  const left = leftOperand ?? extractFieldFromText(innerText, FIELD_BEFORE_LIKE_REGEX);

  return {
    type: 'function',
    name: operatorName,
    subtype: 'binary-expression',
    args: [left ?? createPlaceholderNode(0), right],
    incomplete: true,
    location: { min: textLength, max: textLength },
    text: operatorName,
  };
}

function createPlaceholderNode(textLength: number): ESQLUnknownItem {
  return {
    type: 'unknown',
    name: '',
    text: '',
    location: { min: textLength, max: textLength },
    incomplete: true,
  };
}

function createEmptyListNode(textLength: number): ESQLList {
  return Builder.expression.list.tuple(
    { text: '()', location: { min: textLength, max: textLength }, incomplete: true },
    { location: { min: textLength, max: textLength }, text: '()', incomplete: true }
  );
}

function extractFieldFromText(innerText: string, pattern: RegExp): ESQLSingleAstItem | undefined {
  const match = innerText.match(pattern);

  if (match?.[1]) {
    return Builder.expression.column(match[1]);
  }

  return undefined;
}

// ============================================================================
// Detection Functions
// ============================================================================

/**
 * Detects partial IS NULL / IS NOT NULL operators.
 * Examples: "field IS ", "field IS NOT ", "field IS /"
 */
export function detectNullCheck(innerText: string): PartialOperatorDetection | null {
  const cleanedText = innerText.replace(TRAILING_NON_WORD_REGEX, ' ');

  if (!endsWithIsOrIsNotToken(cleanedText)) {
    return null;
  }

  return {
    operatorName: 'is null',
    textBeforeCursor: innerText,
  };
}

/**
 * Detects partial LIKE / NOT LIKE operators.
 * Examples: "field LIKE ", "field NOT LIKE ", "field LIKE ("
 */
export function detectLike(innerText: string): PartialOperatorDetection | null {
  const cleanedText = innerText.replace(TRAILING_NON_WORD_REGEX, ' ');

  if (!endsWithLikeOrRlikeToken(cleanedText)) {
    return null;
  }

  const isNotLike = NOT_LIKE_REGEX.test(cleanedText);

  return {
    operatorName: isNotLike ? 'not like' : 'like',
    textBeforeCursor: innerText,
  };
}

/**
 * Detects partial IN / NOT IN operators.
 * Examples: "field IN ", "field NOT IN ", "field IN ("
 */
export function detectIn(innerText: string): PartialOperatorDetection | null {
  const cleanedText = innerText.replace(TRAILING_NON_WORD_REGEX, ' ');

  if (!endsWithInOrNotInToken(cleanedText)) {
    return null;
  }

  const isNotIn = NOT_IN_REGEX.test(cleanedText);

  return {
    operatorName: isNotIn ? 'not in' : 'in',
    textBeforeCursor: innerText,
  };
}
