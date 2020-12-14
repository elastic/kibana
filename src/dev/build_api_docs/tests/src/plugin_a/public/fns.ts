/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeWithGeneric, ImAType } from './types';

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
 * @param objWithFn Im an object with a function. Destructed!
 * @param objWithFn.fn A fn.
 * @param objWithStr Im an object with a string. Destructed!
 * @param objWithStr.str A str.
 *
 * @returns I have no idea.
 *
 */
export const crazyFunction = (
  obj: { hi: string },
  { fn }: { fn: (foo: { param: string }) => number },
  { str }: { str: string }
) => () => () => fn({ param: str });
