/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeWithGeneric, ImAType } from './types';
import { ImNotExportedFromIndex } from './foo';

/**
 * This is a non arrow function.
 *
 * @param a The letter A
 * @param b Feed me to the function
 * @param c So many params
 * @param d a great param
 * @param e Another comment
 * @returns something!
 */
export function notAnArrowFn(
  a: string,
  b: number | undefined,
  c: TypeWithGeneric<string>,
  d: ImAType,
  e?: string
): TypeWithGeneric<string> {
  return ['hi'];
}

/**
 * This is an arrow function.
 *
 * @param a The letter A
 * @param b Feed me to the function
 * @param c So many params
 * @param d a great param
 * @param e Another comment
 * @returns something!
 */
export const arrowFn = (
  a: string,
  b: number | undefined,
  c: TypeWithGeneric<string>,
  d: ImAType,
  e?: string
): TypeWithGeneric<string> => {
  return ['hi'];
};

/**
 * Who would write such a complicated function?? Ewwww.
 *
 * According to https://jsdoc.app/tags-param.html#parameters-with-properties,
 * this is how destructured arguements should be commented.
 *
 * @param obj A very crazy parameter that is destructured when passing in.
 *
 * @returns I have no idea.
 *
 */
export const crazyFunction =
  (
    obj: { hi: string },
    { fn1, fn2 }: { fn1: (foo: { param: string }) => number; fn2: () => void },
    { str }: { str: string }
  ) =>
  () =>
  () =>
    fn1({ param: str });

export const fnWithNonExportedRef = (a: ImNotExportedFromIndex) => a;

export type NotAnArrowFnType = typeof notAnArrowFn;

/**
 * @internal
 */
export const iShouldBeInternalFn = () => 'hi';
