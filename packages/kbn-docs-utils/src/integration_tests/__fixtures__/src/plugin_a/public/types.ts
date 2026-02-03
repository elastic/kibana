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

// Expected issues:
//   missing comments (14):
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
//   no references (21):
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
