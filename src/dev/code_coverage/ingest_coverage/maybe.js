/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint new-cap: 0 */
/* eslint no-unused-vars: 0 */

/**
 * Just monad used for valid values
 */
export function Just(x) {
  return {
    value: () => x,
    map: (f) => Maybe.of(f(x)),
    isJust: () => true,
    inspect: () => `Just(${x})`,
  };
}
Just.of = function of(x) {
  return Just(x);
};
export function just(x) {
  return Just.of(x);
}

/**
 * Maybe monad.
 * Maybe.fromNullable` lifts an `x` into either a `Just`
 * or a `Nothing` typeclass.
 */
export function Maybe(x) {
  return {
    chain: (f) => f(x),
    map: (f) => Maybe(f(x)),
    inspect: () => `Maybe(${x})`,
    nothing: () => Nothing(),
    isNothing: () => false,
    isJust: () => false,
  };
}
Maybe.of = function of(x) {
  return just(x);
};

export function maybe(x) {
  return Maybe.of(x);
}
export function fromNullable(x) {
  return x !== null && x !== undefined && x !== false && x !== 'undefined' ? just(x) : nothing();
}

/**
 * Nothing wraps undefined or null values and prevents errors
 * that otherwise occur when mapping unexpected undefined or null
 * values
 */
export function Nothing() {
  return {
    value: () => {
      throw new TypeError(`Nothing algebraic data type returns...no value :)`);
    },
    map: (f) => {},
    isNothing: () => true,
    inspect: () => `[Nothing]`,
  };
}
export function nothing() {
  return Nothing();
}
