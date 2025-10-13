/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISuggestionItem } from '../../../../../../commands_registry/types';
import type { ExpressionContext, PartialOperatorDetection } from '../../types';
import { getFunctionDefinition } from '../../../../functions';
import { createSyntheticListOperatorNode, createSyntheticLikeOperatorNode } from './utils';
import { dispatchOperators } from '../dispatcher';

const WHITESPACE_NORMALIZE_REGEX = /\s+/g;
const TRAILING_WHITESPACE_REGEX = /\s+$/;

const NULL_CHECK_CANDIDATES = ['is null', 'is not null'] as const;

/**
 * Handles IS NULL / IS NOT NULL partial operators.
 * Generates suggestions directly without creating synthetic nodes.
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

/**
 * Handles LIKE / NOT LIKE partial operators.
 * Creates synthetic node and dispatches to normal flow.
 */
export async function handleLikeOperator(
  { operatorName, textBeforeCursor }: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = context;
  const text = textBeforeCursor || innerText;

  const syntheticNode = createSyntheticLikeOperatorNode(operatorName, text, expressionRoot);

  return dispatchOperators({
    ...context,
    expressionRoot: syntheticNode,
    innerText: text,
  });
}

/**
 * Handles IN / NOT IN partial operators.
 * Creates synthetic node and dispatches to normal flow.
 */
export async function handleInOperator(
  { operatorName, textBeforeCursor }: PartialOperatorDetection,
  context: ExpressionContext
): Promise<ISuggestionItem[] | null> {
  const { innerText, expressionRoot } = context;
  const text = textBeforeCursor || innerText;


  const syntheticNode = createSyntheticListOperatorNode(operatorName, text, expressionRoot);


  const result = await dispatchOperators({
    ...context,
    expressionRoot: syntheticNode,
    innerText: text,
  });


  return result;
}
