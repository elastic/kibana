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

export const Right = (x) => ({
  chain: (f) => f(x),
  map: (f) => Right(f(x)),
  fold: (leftFn, rightFn) => rightFn(x),
  inspect: () => `Right(${x})`,
});

Right.of = function of(x) {
  return Right(x);
};

export function right(x) {
  return Right.of(x);
}

export const Left = (x) => ({
  chain: (f) => Left(x),
  map: (f) => Left(x),
  fold: (leftFn, rightFn) => leftFn(x),
  inspect: () => `Left(${x})`,
});

Left.of = function of(x) {
  return Left(x);
};

export function left(x) {
  return Left.of(x);
}

export const fromNullable = (x) =>
  x !== null && x !== undefined && x !== false && x !== 'undefined' ? Right(x) : Left(null);

export const tryCatch = (f) => {
  try {
    return Right(f());
  } catch (e) {
    return Left(e);
  }
};
