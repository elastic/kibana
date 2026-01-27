/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CrazyClass } from './classes';
import { notAnArrowFn } from './fns';
import type { ImAType } from './types';

/**
 * Some of the plugins wrap static exports in an object to create
 * a namespace like this.
 */
export const aPretendNamespaceObj = {
  /**
   * The docs should show this inline comment.
   */
  notAnArrowFn,

  /**
   * Should this comment show up?
   */
  aPropertyMisdirection: notAnArrowFn,

  /**
   * I'm a property inline fun.
   */
  aPropertyInlineFn: (a: ImAType): ImAType => {
    return a;
  },

  /**
   * The only way for this to have a comment is to grab this.
   */
  aPropertyStr: 'Hi',

  /**
   * Will this nested object have it's children extracted appropriately?
   */
  nestedObj: {
    foo: 'string',
  },
};

/**
 * @internal
 */
export const iShouldBeInternalObj = {
  foo: 'hi',
};

/**
 * This is a complicated union type
 */
export const aUnionProperty: string | number | (() => string) | CrazyClass = '6';

/**
 * This is an array of strings. The type is explicit.
 */
export const aStrArray: string[] = ['hi', 'bye'];

/**
 * This is an array of numbers. The type is implied.
 */
export const aNumArray = [1, 3, 4];

/**
 * A string that says hi to you!
 */
export const aStr: string = 'hi';

/**
 * It's a number. A special number.
 */
export const aNum = 10;

/**
 * I'm a type of string, but more specifically, a literal string type.
 */
export const literalString = 'HI';

// Expected issues:
//   missing comments (2):
//     line 32 - a
//     line 45 - foo
//   no references (14):
//     line 18 - aPretendNamespaceObj
//     line 19 - notAnArrowFn
//     line 24 - aPropertyMisdirection
//     line 29 - aPropertyInlineFn
//     line 32 - a
//     line 36 - aPropertyStr
//     line 41 - nestedObj
//     line 45 - foo
//     line 59 - aUnionProperty
//     line 64 - aStrArray
//     line 69 - aNumArray
//     line 74 - aStr
//     line 79 - aNum
//     line 84 - literalString
