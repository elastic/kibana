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
import {
  comparisonFunctions,
  inOperators,
  logicalOperators,
  matchOperators,
  nullCheckOperators,
  patternMatchOperators,
} from '../../../commands/definitions/all_operators';
import {
  isParameterType,
  type FunctionParameterType,
  type SupportedDataType,
} from '../../../commands/definitions/types';
import { getOperatorSuggestion } from '../../../commands/definitions/utils/operators';
import { commaWithAutoSuggestCompleteItem } from '../../../commands/registry/complete_items';
import { EXPRESSION_PARTS } from '../../../esql_js_sim/definitions';
import type { ISuggestionItem } from '../../../commands/registry/types';
import type { CursorIR } from '../../../esql_js_sim/grammar';
import type { ExpressionPosition, ExpressionPositionKind } from './expression_position';

/**
 * The positions this layer decides. The others still go to the expression engine of the
 * current flow, until each is moved here.
 */
export const DECIDED_KINDS = new Set<ExpressionPositionKind>(['empty', 'after_operand']);

/** What a decision needs: the cursor in the grammar, and what the item builders take. */
export interface DecisionInput {
  ir: CursorIR;
  position: ExpressionPosition;
  /** The role and the editor, in the terms the item builders take. */
  request: SuggestForExpressionParams;
  /** The type of what is written of the expression. */
  expressionType: SupportedDataType | 'unknown';
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

/** The word typed spells a keyword the command expects, and not an operator. */
const isTypedKeyword = ({ word, followers }: CursorIR): boolean =>
  followers.some((follower) => follower.token === word?.keyword && follower.class === 'keyword');

const namesOf = (operators: Array<{ name: string }>): string[] => operators.map(({ name }) => name);

const STRING_TYPES: readonly string[] = ['text', 'keyword'];
// What tells of a string: whether it matches, is in a list, or is missing.
const STRING_PREDICATES = namesOf([
  ...matchOperators,
  ...patternMatchOperators,
  ...inOperators,
  ...nullCheckOperators,
]);
const NULL_CHECK_END = 'null';
const ASSIGNMENT = '=';

/**
 * The operators that can follow an operand of a type, by name; all of them when undefined,
 * none when empty. Every operator on a string gives a boolean, so a role that asks for
 * another type takes none after a string.
 */
const getOperatorsAfter = (type: string, preferred: readonly string[]): string[] | undefined => {
  if (!STRING_TYPES.includes(type)) {
    return undefined;
  }

  const takesBoolean = preferred.includes('boolean') || preferred.includes('any');

  if (!takesBoolean && preferred.length > 0) {
    return [];
  }

  return [...(takesBoolean ? namesOf(comparisonFunctions) : []), ...STRING_PREDICATES];
};

/**
 * After a complete operand that no operator is written with, outside a function call: the
 * operators that take an operand of its type on their left.
 */
const decideAfterOperand = (input: DecisionInput): ISuggestionItem[] | undefined => {
  const { position, request, expressionType } = input;
  const { options = {}, location } = request;
  const values = position.written.filter((item) => item.class === 'value' || item.kind === 'rule');
  const brackets = position.written.filter((item) => item.kind === 'token');
  const openers = brackets.filter((item) => item.class === 'opener').length;
  const closers = brackets.filter((item) => item.class === 'closer').length;

  // A list in brackets, as `(a, b)`, is not decided here yet.
  if (brackets.some((item) => item.class === 'separator')) {
    return undefined;
  }
  // A null check is a complete condition: only another condition can be joined to it.
  if (position.operator === NULL_CHECK_END) {
    return logicalOperators.map(getOperatorSuggestion);
  }
  // A null check that is not finished, as `a IS`, is not decided here yet.
  if (position.operator !== undefined) {
    return undefined;
  }
  // A keyword of the command typed in full ends the expression: nothing of it is offered.
  if (isTypedKeyword(input.ir)) {
    return [];
  }
  if (!isParameterType(expressionType)) {
    return [];
  }

  const builder = new SuggestionBuilder(toBuilderContext(input));
  const isLiteral = values.length === 1 && EXPRESSION_PARTS[values[0].id]?.part === 'literal';
  const preferred = [options.preferredExpressionType ?? []].flat();
  const allowed =
    isLiteral && expressionType === 'boolean'
      ? namesOf(
          logicalOperators.filter((operator) => operator.locationsAvailable.includes(location))
        )
      : getOperatorsAfter(expressionType, preferred);

  if (allowed?.length !== 0) {
    builder.addOperators({
      leftParamType: expressionType === 'param' ? undefined : expressionType,
      allowed,
      ignored: [ASSIGNMENT],
    });
  }
  // Inside brackets that may hold a list, as that of `IN`, the next value can follow.
  if (options.allowSubquery && openers > closers && input.ir.next?.class === 'closer') {
    builder.addSuggestions([commaWithAutoSuggestCompleteItem]);
  }

  return builder.build();
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

  return kind === 'after_operand' ? decideAfterOperand(input) : decideOperandStart(input);
};
