/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * How should a potentially undefined type show up.
 */
export type StringOrUndefinedType = string | undefined;

export type TypeWithGeneric<T> = T[];

export type ImAType = string | number | TypeWithGeneric<string>;

/**
 * This is a type that defines a function.
 *
 * @param t This is a generic T type. It can be anything.
 */
export type FnWithGeneric = <T>(t: T) => TypeWithGeneric<T>;

/**
 * Comments on enums.
 */
export enum DayOfWeek {
  THURSDAY,
  FRIDAY, // How about this comment, hmmm?
  SATURDAY,
}
