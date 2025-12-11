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
} from '../../../../../../../types';
import type { PartialOperatorDetection } from '../../types';
import {
  endsWithInOrNotInToken,
  endsWithIsOrIsNotToken,
  endsWithLikeOrRlikeToken,
  LIKE_OPERATOR_REGEX,
  NOT_IN_REGEX,
  IS_NOT_REGEX,
} from '../utils';
import { Builder } from '../../../../../../../ast/builder';

// Regex to extract field name before operator: match[1] = fieldName
// Matches with or without opening parenthesis
const FIELD_BEFORE_IN_REGEX = /([\w.]+)\s+(?:not\s+)?in\s*\(?\s*$/i;
const FIELD_BEFORE_LIKE_REGEX = /([\w.]+)\s+(?:not\s+)?(?:r)?like\s*\(?\s*$/i;

/**
 * Creates a synthetic infix operator node (IN, LIKE, RLIKE, etc.).
 * Used when cursor is right after operator: "field IN ", "field IN(", "field LIKE ".
 * If innerText ends with "(", creates a list node instead of placeholder.
 */
function createSyntheticInfixOperatorNode(
  operatorName: string,
  innerText: string,
  fieldPattern: RegExp,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction {
  const textLength = innerText.length;
  const hasOpenParen = /\(\s*$/.test(innerText);

  const right = hasOpenParen ? createEmptyListNode(textLength) : createPlaceholderNode(textLength);
  const left = leftOperand ?? extractFieldFromText(innerText, fieldPattern);

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

export function createSyntheticListOperatorNode(
  operatorName: string,
  innerText: string,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction {
  return createSyntheticInfixOperatorNode(
    operatorName,
    innerText,
    FIELD_BEFORE_IN_REGEX,
    leftOperand
  );
}

export function createSyntheticLikeOperatorNode(
  operatorName: string,
  innerText: string,
  leftOperand?: ESQLSingleAstItem
): ESQLFunction {
  return createSyntheticInfixOperatorNode(
    operatorName,
    innerText,
    FIELD_BEFORE_LIKE_REGEX,
    leftOperand
  );
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

/**
 * Detects partial IS NULL / IS NOT NULL operators.
 * Examples: "field IS ", "field IS N", "field IS NOT ", "field IS NOT N"
 */
export function detectNullCheck(innerText: string): PartialOperatorDetection | null {
  if (!endsWithIsOrIsNotToken(innerText)) {
    return null;
  }

  // Check if it contains NOT to determine which operator
  const containsNot = IS_NOT_REGEX.test(innerText);

  return {
    operatorName: containsNot ? 'is not null' : 'is null',
    textBeforeCursor: innerText,
  };
}

/**
 * Detects partial LIKE / RLIKE / NOT LIKE / NOT RLIKE operators.
 * Examples: "field LIKE ", "field RLIKE ", "field NOT LIKE ", "field NOT RLIKE "
 */
export function detectLike(innerText: string): PartialOperatorDetection | null {
  if (!endsWithLikeOrRlikeToken(innerText)) {
    return null;
  }

  const match = innerText.match(LIKE_OPERATOR_REGEX);

  if (!match) {
    return null;
  }

  // Normalize: lowercase, trim, collapse multiple spaces
  const operatorName = match[0].toLowerCase().trim().replace(/\s+/g, ' ');

  return {
    operatorName,
    textBeforeCursor: innerText,
  };
}

/**
 * Detects partial IN / NOT IN operators.
 * Examples: "field IN ", "field IN(", "field NOT IN ", "field NOT IN("
 */
export function detectIn(innerText: string): PartialOperatorDetection | null {
  // Don't clean the text - we want to preserve parentheses to NOT match them
  if (!endsWithInOrNotInToken(innerText)) {
    return null;
  }

  const isNotIn = NOT_IN_REGEX.test(innerText);

  return {
    operatorName: isNotIn ? 'not in' : 'in',
    textBeforeCursor: innerText,
  };
}
