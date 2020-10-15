/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
