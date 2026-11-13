/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SuggestionBuilder } from '../../../commands/definitions/utils/autocomplete/expressions/suggestion_builder';
import type {
  ExpressionContext,
  SuggestForExpressionParams,
} from '../../../commands/definitions/utils/autocomplete/expressions/types';
import type { FunctionParameterType } from '../../../commands/definitions/types';
import type { ISuggestionItem } from '../../../commands/registry/types';
import type { CursorIR } from '../../../esql_js_sim/grammar';
import type { ExpressionPosition, ExpressionPositionKind } from './expression_position';

/**
 * The positions this layer decides. The others still go to the expression engine of the
 * current flow, until each is moved here.
 */
export const DECIDED_KINDS = new Set<ExpressionPositionKind>(['empty']);

/** What a decision needs: the cursor in the grammar, and what the item builders take. */
export interface DecisionInput {
  ir: CursorIR;
  position: ExpressionPosition;
  /** The role and the editor, in the terms the item builders take. */
  request: SuggestForExpressionParams;
}

// The grammar name of the bracket that opens the arguments of a function.
const OPENING_BRACKET = 'LP';

/** What the item builders read: the request, with what the grammar says comes next. */
const toBuilderContext = ({ ir, request }: DecisionInput): ExpressionContext => ({
  ...request,
  innerText: request.query.slice(0, request.cursorPosition),
  options: {
    ...request.options,
    isCursorFollowedByComma: ir.next?.class === 'separator',
    isCursorFollowedByParens: ir.next?.token === OPENING_BRACKET,
  },
});

/**
 * Where an operand starts and the expression is not inside a function call: the columns and
 * the functions of the types the role accepts. A boolean is usually built from operands of
 * other types, as `a > 1`, so a role that asks for a boolean takes any operand here.
 */
const decideOperandStart = async (input: DecisionInput): Promise<ISuggestionItem[]> => {
  const { options = {} } = input.request;
  const preferred = [options.preferredExpressionType ?? []].flat();
  const isStrict =
    preferred.length > 0 && !preferred.includes('boolean') && !preferred.includes('any');
  const types = (isStrict ? preferred : ['any']) as FunctionParameterType[];
  const builder = new SuggestionBuilder(toBuilderContext(input));

  if (options.suggestFields ?? true) {
    await builder.addFields({
      types,
      ignoredColumns: options.ignoredColumnsForEmptyExpression ?? [],
      addSpaceAfterField: options.addSpaceAfterFirstField ?? true,
    });
  }

  return builder.addFunctions({ types }).build();
};

/**
 * The items for a position inside an expression, decided from the grammar position. Returns
 * nothing for a position this layer does not decide yet.
 */
export const decideExpression = async (
  input: DecisionInput
): Promise<ISuggestionItem[] | undefined> => {
  const { kind, call } = input.position;

  if (!DECIDED_KINDS.has(kind) || call) {
    return undefined;
  }

  return decideOperandStart(input);
};
