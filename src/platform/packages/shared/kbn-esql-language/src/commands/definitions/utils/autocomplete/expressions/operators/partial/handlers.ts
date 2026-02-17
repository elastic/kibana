/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../registry/types';
import type { ExpressionContext, PartialOperatorDetection } from '../../types';
import type { ESQLSingleAstItem, ESQLFunction } from '../../../../../../../types';
import { getFunctionDefinition } from '../../../../functions';
import { createSyntheticListOperatorNode, createSyntheticLikeOperatorNode } from './utils';
import { dispatchOperators } from '../dispatcher';
import { inOperators, patternMatchOperators } from '../../../../../all_operators';

const WHITESPACE_NORMALIZE_REGEX = /\s+/g;
const TRAILING_WHITESPACE_REGEX = /\s+$/;

const NULL_CHECK_CANDIDATES = ['is null', 'is not null'] as const;

/**
 * Handles IS NULL / IS NOT NULL partial operators.
 * Generates suggestions directly without creating synthetic nodes.
 * Supports prefix matching: "IS N" suggests both IS NULL and IS NOT NULL.
 */
export async function handleNullCheckOperator(
  { textBeforeCursor }: PartialOperatorDetection,
  { innerText }: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const text = textBeforeCursor || innerText;
  const queryNormalized = text
    .toLowerCase()
    .replace(WHITESPACE_NORMALIZE_REGEX, ' ')
    .replace(TRAILING_WHITESPACE_REGEX, ' ');

  const suggestions: ISuggestionItem[] = [];

  for (const name of NULL_CHECK_CANDIDATES) {
    const def = getFunctionDefinition(name);

    if (!def) {
      continue;
    }

    const candidateLower = name.toLowerCase();
    const matches = [...candidateLower].some((_, i) =>
      queryNormalized.endsWith(candidateLower.slice(0, i + 1))
    );

    if (matches) {
      suggestions.push({
        label: name.toUpperCase(),
        text: name.toUpperCase(),
        kind: 'Operator',
        detail: def.description,
        sortText: 'D',
      });
    }
  }

  return suggestions.length > 0 ? suggestions : null;
}

export async function handleLikeOperator(
  detection: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  return handleInfixOperator(
    detection,
    context,
    patternMatchOperators.map((op) => op.name),
    createSyntheticLikeOperatorNode
  );
}

export async function handleInOperator(
  detection: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  return handleInfixOperator(
    detection,
    context,
    inOperators.map((op) => op.name),
    createSyntheticListOperatorNode
  );
}

/**
 * Handles infix operators with content (IN, LIKE, RLIKE, etc.).
 * Uses existing AST node if available, otherwise creates synthetic node.
 */
async function handleInfixOperator(
  { operatorName, textBeforeCursor }: PartialOperatorDetection,
  context: ExpressionContext,
  operatorNames: string[],
  createSyntheticNode: (
    operatorName: string,
    text: string,
    expressionRoot?: ESQLSingleAstItem
  ) => ESQLFunction
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = context;
  const text = textBeforeCursor || innerText;

  const hasValidAstNode =
    expressionRoot?.type === 'function' &&
    operatorNames.includes(expressionRoot.name?.toLowerCase() ?? '');

  if (hasValidAstNode) {
    return dispatchOperators({ ...context, innerText: text });
  }

  const leftOperand = expressionRoot?.type === 'column' ? expressionRoot : undefined;
  const syntheticNode = createSyntheticNode(operatorName, text, leftOperand);

  return dispatchOperators({
    ...context,
    expressionRoot: syntheticNode,
    innerText: text,
  });
}
