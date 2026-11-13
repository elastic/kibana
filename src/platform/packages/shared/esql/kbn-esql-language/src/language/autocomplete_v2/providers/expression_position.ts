/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EXPRESSION_PARTS, FUNCTION_CALL, type CallSiteId } from '../../../esql_js_sim/definitions';
import type { CursorIR, WrittenAncestor, WrittenArgument } from '../../../esql_js_sim/grammar';

/**
 * Where the cursor is inside an expression, read from the grammar position alone.
 *
 * - `empty`: an operand starts here and nothing of it is written, or only the word typed.
 * - `after_not`: right after a `NOT` that starts an operand.
 * - `after_cast`: right after `::`, or in the type name after it.
 * - `after_operand`: after a complete operand that no operator is written with.
 * - `after_operator`: an operator is written in the expression the cursor is in.
 * - `in_string`, `in_map`: in a string or in the named parameters of a function.
 */
export type ExpressionPositionKind =
  | 'empty'
  | 'after_not'
  | 'after_cast'
  | 'after_operand'
  | 'after_operator'
  | 'in_string'
  | 'in_map';

export interface ExpressionPosition {
  kind: ExpressionPositionKind;
  /** The function call the cursor is directly in, and which of its arguments, from zero. */
  call?: { name: string; argument: number };
  /** Where the expression the cursor is in starts: the argument of the call, or the whole. */
  start?: number;
  /** What is written of that expression, in order. */
  written: WrittenArgument[];
  /** The last operator written in it, in lower case. */
  operator?: string;
}

const CAST = '::';
const NOT = 'not';
const NULL_CHECK = 'is';
const NULL_CHECK_WORDS: readonly string[] = ['is', 'not', 'null'];
const SIGNS: readonly string[] = ['-', '+'];
const MAP_PARTS: readonly string[] = ['map_key', 'map_value'];

const isSame = (first: WrittenAncestor | undefined, second: WrittenAncestor): boolean =>
  first?.id === second.id && first.start === second.start;

const partOf = ({ id }: WrittenArgument): string | undefined => EXPRESSION_PARTS[id]?.part;

const textOf = ({ text }: WrittenArgument): string => text.toLowerCase();

/** The operators written in the expression itself, and not in a call nested in it. */
const getOperators = (written: WrittenArgument[], call?: WrittenAncestor): WrittenArgument[] =>
  written.filter((item, index) => {
    const nestedCall = item.ancestors.findLast(({ id }) => id === FUNCTION_CALL);
    const isNested = nestedCall !== undefined && !(call && isSame(nestedCall, call));
    // A sign before an operand belongs to the operand.
    const before = written[index - 1];
    const isSign = SIGNS.includes(item.text) && (!before || before.class === 'operator');

    return item.class === 'operator' && !isNested && !isSign && item.text !== CAST;
  });

/**
 * Describes the cursor inside the expression that `entry` is the call site of. Nothing but the
 * grammar position is read: not the text, and not the syntax tree.
 */
export const describeExpressionPosition = (ir: CursorIR, entry: CallSiteId): ExpressionPosition => {
  const last = ir.written.at(-1);
  const around = last?.ancestors ?? [];
  const whole = around.find(({ id }) => id === entry);
  const isClosed = (place: WrittenAncestor): boolean =>
    ir.written.some((item) => item.class === 'closer' && isSame(item.ancestors.at(-1), place));
  // The cursor is in a call until its closing bracket is written.
  const callPlace =
    whole &&
    around.findLast((place) => place.id === FUNCTION_CALL && place.open && !isClosed(place));
  const inCall = callPlace
    ? ir.written.filter(({ ancestors }) => isSame(ancestors.at(-1), callPlace))
    : [];
  const separators = inCall.filter((item) => item.class === 'separator');
  const name = inCall.find((item) => partOf(item) === 'function_name')?.text.toLowerCase();
  const call = callPlace && name ? { name, argument: separators.length } : undefined;
  // The expression starts after the bracket or the comma of the call, or where the whole does.
  const from = callPlace
    ? (separators.at(-1) ?? inCall.find(({ kind }) => kind === 'token'))?.end
    : whole?.start;
  const written = from === undefined ? [] : ir.written.filter(({ start }) => start >= from);
  const operands = written.filter((item) => item.class !== 'opener');
  const start = operands[0]?.start ?? ir.word?.start;
  const base = { call, start, written };

  if (ir.position === 'inside_string') {
    return { ...base, kind: 'in_string' };
  }
  if (ir.arguments.some(({ id }) => MAP_PARTS.includes(EXPRESSION_PARTS[id]?.part ?? ''))) {
    return { ...base, kind: 'in_map' };
  }
  // Nothing is written, or the word typed goes on with a name, as after the dot of `a.b`.
  if (!operands.length || ir.word?.argument) {
    return { ...base, kind: 'empty' };
  }

  const lastOperand = operands[operands.length - 1];

  if (textOf(lastOperand) === CAST || (ir.word && textOf(lastOperand) === CAST)) {
    return { ...base, kind: 'after_cast' };
  }

  const operators = getOperators(operands, callPlace);
  const operator = operators.at(-1)?.text.toLowerCase();
  const isNullCheck = operators.some((item) => textOf(item) === NULL_CHECK);

  if (!ir.word && textOf(lastOperand) === NOT && !isNullCheck) {
    return { ...base, operator, kind: 'after_not' };
  }
  // A null check alone, `a IS NULL`, is a complete operand.
  const binary = operators.filter(
    (item) => !isNullCheck || !NULL_CHECK_WORDS.includes(textOf(item))
  );
  // A keyword typed in full after an operand is an operator that is written, as `a AND`.
  const typed = ir.word?.keyword;
  const isTypedOperator = ir.followers.some(
    (follower) => follower.token === typed && follower.class === 'operator'
  );

  if (binary.length || isTypedOperator) {
    return { ...base, operator, kind: 'after_operator' };
  }

  // A word typed after a complete operand is an operator or a keyword being typed.
  return { ...base, operator, kind: 'after_operand' };
};
