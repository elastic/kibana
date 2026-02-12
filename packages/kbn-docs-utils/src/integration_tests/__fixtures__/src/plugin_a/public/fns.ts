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
 * this is how destructured arguments should be commented.
 * Use a named object and dot-notation properties rather than inline destructuring.
 *
 * @param {Object} obj A very crazy parameter that is destructured when passing in.
 * @param {string} obj.hi Greeting on the obj.
 * @param {{fn1: (foo: {param: string}) => number, fn2: () => void}} fns A destructured object containing two functions.
 * @param {(foo: {param: string}) => number} fns.fn1 The first function.
 * @param {() => void} fns.fn2 The second function.
 * @param {{param: string}} fns.fn1.foo A parameter object for fn1.
 * @param {string} fns.fn1.foo.param A nested parameter for foo.
 * @param {{str: string}} strObj A destructured object containing a string.
 * @param {string} strObj.str The string property.
 *
 * @returns I have no idea.
 *
 */
export const crazyFunction =
  (
    obj: { hi: string },
    fns: { fn1: (foo: { param: string }) => number; fn2: () => void },
    strObj: { str: string }
  ) =>
  () =>
  () =>
    fns.fn1({ param: strObj.str });

export const fnWithNonExportedRef = (a: ImNotExportedFromIndex) => a;

export type NotAnArrowFnType = typeof notAnArrowFn;

/**
 * @internal
 */
export const iShouldBeInternalFn = () => 'hi';

// Expected issues:
//   missing comments (18):
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
//     line 83 - a
//     line 83 - fnWithNonExportedRef
//     line 85 - NotAnArrowFnType
//   param doc mismatches (2):
//     line 83 - fnWithNonExportedRef
//     line 85 - NotAnArrowFnType
//   missing complex type info (3):
//     line 27 - d
//     line 27 - d
//     line 27 - d
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
//     line 73 - crazyFunction
//     line 75 - hi
//     line 75 - obj
//     line 76 - fn1
//     line 76 - fn2
//     line 76 - fns
//     line 76 - foo
//     line 76 - param
//     line 77 - str
//     line 77 - strObj
//     line 83 - a
//     line 83 - fnWithNonExportedRef
//     line 85 - NotAnArrowFnType
