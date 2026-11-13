/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EXPRESSION_PARTS,
  FUNCTION_CALL,
  FUNCTION_LAMBDAS,
} from '../../../esql_js_sim/definitions';
import type { CursorIR, WrittenAncestor, WrittenArgument } from '../../../esql_js_sim/grammar';

interface Range {
  start: number;
  end: number;
}

/**
 * Where the cursor is in a lambda, if it is in one.
 *
 * - `parameters`: at the start of a function argument that takes a lambda.
 * - `arrow`: after the name of the parameter of such an argument.
 * - `body`: after the arrow of a lambda, with the names the lambdas around the cursor declare.
 */
export type LambdaState =
  | { kind: 'parameters'; count: number }
  | { kind: 'arrow' }
  | { kind: 'body'; parameters: LambdaParameter[] };

/** A parameter the body of a lambda can read. */
export interface LambdaParameter {
  name: string;
  /** Where the argument starts whose values the parameter stands for, when the function says. */
  valuesFrom?: number;
}

const isSame = (first: WrittenAncestor | undefined, second: WrittenAncestor): boolean =>
  first?.id === second.id && first.start === second.start;

/** What is written directly in a place, and not in a place nested in it. */
const writtenIn = (ir: CursorIR, place: WrittenAncestor): WrittenArgument[] =>
  ir.written.filter(({ ancestors }) => isSame(ancestors.at(-1), place));

const partOf = ({ id }: WrittenArgument): string | undefined => EXPRESSION_PARTS[id]?.part;

/** The function call a place is an argument of: its name, and where each argument starts. */
const getCall = (
  ir: CursorIR,
  place: WrittenAncestor
): { name?: string; separators: WrittenArgument[]; argumentStarts: number[] } | undefined => {
  const chain = ir.written.find(({ ancestors }) => ancestors.some((above) => isSame(above, place)));
  const index = chain?.ancestors.findIndex((above) => isSame(above, place)) ?? -1;
  const call = place.id === FUNCTION_CALL ? place : chain?.ancestors[index - 1];

  if (call?.id !== FUNCTION_CALL) {
    return undefined;
  }

  const inCall = writtenIn(ir, call);
  const separators = inCall.filter((written) => written.class === 'separator');
  const opener = inCall.find(({ kind }) => kind === 'token');
  // An argument starts with the first thing written after the bracket or the comma before it.
  const argumentStarts = [opener, ...separators].flatMap((before) => {
    const first = ir.written.find(({ start }) => before !== undefined && start >= before.end);

    return first ? [first.start] : [];
  });

  return {
    name: inCall.find((written) => partOf(written) === 'function_name')?.text.toLowerCase(),
    separators,
    argumentStarts,
  };
};

/** A lambda written before the cursor. */
export interface WrittenLambda {
  parameters: LambdaParameter[];
  /** From its start to the end of its arrow. */
  head: Range;
  /** The cursor is in its body, so the body can read its parameters. */
  isAroundCursor: boolean;
}

/** A place that declares a name and has its arrow written: a lambda, up to its body. */
const asLambda = (
  ir: CursorIR,
  place: WrittenAncestor
): Omit<WrittenLambda, 'isAroundCursor'> | undefined => {
  const inside = writtenIn(ir, place);
  const names = inside.filter((written) => partOf(written) === 'new_name');
  const arrow = inside.find((written) => written.class === 'operator');

  if (!names.length || !arrow) {
    return undefined;
  }

  const call = getCall(ir, place);
  const valuesOf = call?.name === undefined ? undefined : FUNCTION_LAMBDAS[call.name]?.valuesOf;
  const valuesFrom = valuesOf === undefined ? undefined : call?.argumentStarts[valuesOf];

  return {
    parameters: names.map(({ text }) => ({ name: text, valuesFrom })),
    head: { start: place.start, end: arrow.end },
  };
};

/**
 * Every lambda written before the cursor, outermost first. The cursor is in the body of the
 * ones the last written thing belongs to: what is typed next goes on in them.
 */
export const getLambdas = (ir: CursorIR): WrittenLambda[] => {
  const around = ir.written.at(-1)?.ancestors ?? [];
  const lambdas = new Map<number, WrittenLambda>();

  for (const place of ir.written.flatMap(({ ancestors }) => ancestors)) {
    const lambda = lambdas.has(place.start) ? undefined : asLambda(ir, place);

    if (lambda) {
      lambdas.set(place.start, {
        ...lambda,
        isAroundCursor: around.some((above) => isSame(above, place)),
      });
    }
  }

  return [...lambdas.values()].sort((first, second) => first.head.start - second.head.start);
};

/** The lambda the cursor is in, read from what is written of the function call around it. */
export const getLambdaState = (ir: CursorIR): LambdaState | undefined => {
  const open = ir.written.at(-1)?.ancestors.filter((ancestor) => ancestor.open) ?? [];
  const parameters = getLambdas(ir)
    .filter(({ isAroundCursor }) => isAroundCursor)
    .flatMap((lambda) => lambda.parameters);

  if (parameters.length) {
    return { kind: 'body', parameters };
  }

  // The function call the cursor is directly in, and what is written of the current argument.
  const place = open.findLast(({ id }) => id === FUNCTION_CALL);
  const call = place && getCall(ir, place);
  const lambda = call?.name === undefined ? undefined : FUNCTION_LAMBDAS[call.name];

  if (!place || !call || !lambda || call.separators.length !== lambda.argument) {
    return undefined;
  }

  const argumentStart = call.argumentStarts[lambda.argument];
  const argument = ir.written.filter(
    ({ start }) => argumentStart !== undefined && start >= argumentStart
  );

  if (!argument.length) {
    return { kind: 'parameters', count: lambda.parameters };
  }

  // A lone name is the parameter: the arrow follows it.
  return argument.length === 1 && partOf(argument[0]) === 'column' && !ir.word
    ? { kind: 'arrow' }
    : undefined;
};
