/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PromQLAstQueryExpression } from '../../../../embedded_languages/promql/types';
import { promqlOperatorDefinitions } from '../../generated/promql_operators';
import { findCursorContext } from './cursor_context';
import { getLabelMapTextFallbackPosition } from './query_helpers';
import type { PromqlCursorModel } from './types';

const PROMQL_BINARY_OPS_PATTERN = promqlOperatorDefinitions
  .filter((definition) => definition.signatures.some((signature) => signature.params.length >= 2))
  .map((definition) =>
    (definition.operator ?? definition.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  )
  .join('|');

const PROMQL_TRAILING_BINARY_OP_REGEX = new RegExp(`(${PROMQL_BINARY_OPS_PATTERN})\\s*$`, 'i');

/**
 * Builds a single cursor model from AST + text, so resolvers
 * can consume normalized signals instead of recomputing them.
 */
export function buildPromqlCursorModel(
  root: PromQLAstQueryExpression,
  cursor: number,
  text: string
): PromqlCursorModel {
  const textBeforeCursor = text.slice(0, cursor).trimEnd();
  const trailingOperatorMatch = textBeforeCursor.match(PROMQL_TRAILING_BINARY_OP_REGEX);
  const { match, innermostFunc, outermostIncompleteBinary } = findCursorContext(root, cursor);

  return {
    cursor,
    text,
    textBeforeCursor,
    lastChar: textBeforeCursor.at(-1),
    ast: {
      root,
      match,
      innermostFunc,
      outermostIncompleteBinary,
    },
    textSignals: {
      trailingBinaryOperator: trailingOperatorMatch?.[1],
      labelMapFallback: getLabelMapTextFallbackPosition(text, cursor),
    },
  };
}
