/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ReactElement } from 'react';
import { ImACommonType } from '../common';
import { FooType, ImNotExportedFromIndex } from './foo';

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
