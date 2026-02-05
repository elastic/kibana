/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeWithGeneric, ImAType } from './types';
import type { ImNotExportedFromIndex } from './foo';

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

// Expected issues:
//   missing comments (27):
//     line 24 - a
//     line 24 - a
//     line 24 - a
//     line 25 - b
//     line 25 - b
//     line 25 - b
//     line 26 - c
//     line 26 - c
//     line 26 - c
//     line 27 - d
//     line 27 - d
//     line 27 - d
//     line 28 - e
//     line 28 - e
//     line 28 - e
//     line 66 - hi
//     line 66 - obj
//     line 67 - { fn1, fn2 }
//     line 67 - fn1
//     line 67 - fn2
//     line 67 - foo
//     line 67 - param
//     line 68 - { str }
//     line 68 - str
//     line 74 - a
//     line 74 - fnWithNonExportedRef
//     line 76 - NotAnArrowFnType
//   no references (40):
//     line 13 - notAnArrowFn
//     line 24 - a
//     line 24 - a
//     line 24 - a
//     line 24 - a
//     line 25 - b
//     line 25 - b
//     line 25 - b
//     line 25 - b
//     line 26 - c
//     line 26 - c
//     line 26 - c
//     line 26 - c
//     line 27 - d
//     line 27 - d
//     line 27 - d
//     line 27 - d
//     line 28 - e
//     line 28 - e
//     line 28 - e
//     line 28 - e
//     line 43 - arrowFn
//     line 44 - a
//     line 45 - b
//     line 46 - c
//     line 47 - d
//     line 48 - e
//     line 64 - crazyFunction
//     line 66 - hi
//     line 66 - obj
//     line 67 - { fn1, fn2 }
//     line 67 - fn1
//     line 67 - fn2
//     line 67 - foo
//     line 67 - param
//     line 68 - { str }
//     line 68 - str
//     line 74 - a
//     line 74 - fnWithNonExportedRef
//     line 76 - NotAnArrowFnType
