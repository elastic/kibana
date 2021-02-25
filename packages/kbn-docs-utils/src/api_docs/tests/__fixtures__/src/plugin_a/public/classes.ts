/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

import { ImAType } from './types';

/**
 * An interface with a generic.
 */
export interface WithGen<T = number> {
  t: T;
}

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
   */
  aFnWithGen: <T>(t: T) => void;

  /**
   * These are not coming back properly.
   */
  aFn(): void;
}

/**
 * An interface that has a react component.
 */
export interface IReturnAReactComponent {
  component: React.ComponentType;
}
