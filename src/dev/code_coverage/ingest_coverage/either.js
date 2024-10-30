/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint new-cap: 0 */
/* eslint no-unused-vars: 0 */

import { always } from './utils';

export const Right = (x) => ({
  chain: (f) => f(x),
  map: (f) => Right(f(x)),
  fold: (leftFn, rightFn) => rightFn(x),
  inspect: () => `Right(${x})`,
  isLeft: always(false),
  isRight: always(true),
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
  isLeft: always(true),
  isRight: always(false),
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
