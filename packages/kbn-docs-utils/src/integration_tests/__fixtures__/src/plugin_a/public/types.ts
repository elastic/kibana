/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type { ImACommonType } from '../common';
import type { FooType, ImNotExportedFromIndex } from './foo';

/**
 * How should a potentially undefined type show up.
 */
export type StringOrUndefinedType = string | undefined;

export type TypeWithGeneric<T> = T[];

export type ImAType = string | number | TypeWithGeneric<string> | FooType | ImACommonType;

/**
 * This is a type that defines a function.
 *
 * @param t This is a generic T type. It can be anything.
 */
export type FnWithGeneric = <T>(t: T) => TypeWithGeneric<T>;

/**
 * Ever so slightly different than above. Users of this type must specify the generic.
 *
 * @param t something!
 * @return something!
 */
export type FnTypeWithGeneric<T> = (t: T, p: MyProps) => TypeWithGeneric<T>;

/**
 * Comments on enums.
 */
export enum DayOfWeek {
  THURSDAY,
  FRIDAY, // How about this comment, hmmm?
  SATURDAY,
}

/**
 * Calling node.getSymbol().getDeclarations() will return > 1 declaration.
 */
export type MultipleDeclarationsType = TypeWithGeneric<typeof DayOfWeek>;

export type IRefANotExportedType = ImNotExportedFromIndex | { zed: 'hi' };
export interface ImAnObject {
  foo: FnWithGeneric;
}

/** @internal */
export type IShouldBeInternal = string | { foo: string };

export interface MyProps {
  foo: string;
  bar: FnWithGeneric;
}

export type AReactElementFn = () => ReactElement<MyProps>;

/**
 * A function type with multiple call signatures (overloads).
 * This demonstrates handling of overloaded function types.
 *
 * @param input The input value to process.
 * @returns The processed result.
 */
export interface OverloadedFunction {
  /**
   * Parse a string and return a number.
   * @param input A string to parse.
   * @returns The parsed number.
   */
  (input: string): number;
  /**
   * Double a number.
   * @param input A number to double.
   * @returns The doubled value as a string.
   */
  (input: number): string;
  /**
   * Parse an array of strings.
   * @param input An array of strings to parse.
   * @returns An array of parsed numbers.
   */
  (input: string[]): number[];
}

/**
 * A variable typed with the overloaded function.
 */
export const overloadedFn: OverloadedFunction = ((input: string | number | string[]) => {
  if (typeof input === 'string') {
    return parseInt(input, 10);
  }
  if (typeof input === 'number') {
    return String(input * 2);
  }
  return input.map((s) => parseInt(s, 10));
}) as OverloadedFunction;

// Expected issues:
//   missing comments (15):
//     line 19 - TypeWithGeneric
//     line 21 - ImAType
//     line 28 - t
//     line 28 - t
//     line 36 - p
//     line 36 - p
//     line 36 - t
//     line 52 - IRefANotExportedType
//     line 53 - ImAnObject
//     line 54 - foo
//     line 60 - MyProps
//     line 61 - foo
//     line 62 - bar
//     line 65 - AReactElementFn
//     line 80 - input
//   param doc mismatches (4):
//     line 30 - FnTypeWithGeneric
//     line 54 - foo
//     line 62 - bar
//     line 98 - overloadedFn
//   missing complex type info (4):
//     line 36 - p
//     line 36 - p
//     line 53 - ImAnObject
//     line 60 - MyProps
//   missing returns (5):
//     line 23 - FnWithGeneric
//     line 54 - foo
//     line 62 - bar
//     line 65 - AReactElementFn
//     line 98 - overloadedFn
//   no references (30):
//     line 14 - StringOrUndefinedType
//     line 19 - TypeWithGeneric
//     line 21 - ImAType
//     line 23 - FnWithGeneric
//     line 28 - t
//     line 28 - t
//     line 28 - t
//     line 30 - FnTypeWithGeneric
//     line 36 - p
//     line 36 - p
//     line 36 - t
//     line 36 - t
//     line 38 - DayOfWeek
//     line 47 - MultipleDeclarationsType
//     line 52 - IRefANotExportedType
//     line 53 - ImAnObject
//     line 54 - foo
//     line 60 - MyProps
//     line 61 - foo
//     line 62 - bar
//     line 65 - AReactElementFn
//     line 67 - OverloadedFunction
//     line 75 - Unnamed
//     line 80 - input
//     line 80 - input
//     line 81 - Unnamed
//     line 86 - input
//     line 87 - Unnamed
//     line 92 - input
//     line 98 - overloadedFn
