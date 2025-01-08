/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { FnTypeWithGeneric, ImAType } from './types';

/**
 * @internal
 */
export class IShouldBeInternalClass {
  st: string;
}

/**
 * @internal
 */
export interface IShouldBeInternalInterface {
  st: string;
}

/**
 * An interface with a generic.
 */
export interface WithGen<T = number> {
  t: T;
}

/**
 *
 * @deprecated
 * @removeBy 8.0
 */
export interface AnotherInterface<T> {
  t: T;
}

export class ExampleClass<T> implements AnotherInterface<T> {
  /**
   * This should not be exposed in the docs!
   */
  private privateVar: string;

  public component?: React.ComponentType;

  constructor(public t: T) {
    this.privateVar = 'hi';
  }

  /**
   * an arrow fn on a class.
   * @param a im a string
   */
  arrowFn = (a: ImAType): ImAType => a;

  /**
   * A function on a class.
   * @param a a param
   */
  getVar(a: ImAType) {
    return this.privateVar;
  }
}

export class CrazyClass<P extends ImAType = any> extends ExampleClass<WithGen<P>> {}

/**
 * This is an example interface so we can see how it appears inside the API
 * documentation system.
 */
export interface ExampleInterface extends AnotherInterface<string> {
  /**
   * This gets a promise that resolves to a string.
   */
  getAPromiseThatResolvesToString: () => Promise<string>;

  /**
   * This function takes a generic. It was sometimes being tripped on
   * and returned as an unknown type with no signature.
   * @param t This a parameter.
   * @returns nothing!
   */
  aFnWithGen: <T>(t: T) => void;

  /**
   * Add coverage for this bug report: https://github.com/elastic/kibana/issues/107145
   */
  anOptionalFn?: (foo: string) => string;

  /**
   * These are not coming back properly.
   */
  aFn(): void;

  /**
   * This one is slightly different than the above `aFnWithGen`. The generic is part of the type, not the function (it's before the = sign).
   * Ideally, we can still capture the children.
   */
  fnTypeWithGeneric: FnTypeWithGeneric<string>;

  /**
   * Optional code path is different than others.
   */
  fnTypeWithGenericThatIsOptional?: FnTypeWithGeneric<string>;
}

/**
 * An interface that has a react component.
 */
export interface IReturnAReactComponent {
  component: React.ComponentType;
}
