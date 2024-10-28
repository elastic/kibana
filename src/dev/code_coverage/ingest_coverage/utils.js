/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';

export const pipe = (...fns) =>
  fns.reduce(
    (f, g) =>
      (...args) =>
        g(f(...args))
  );
export const noop = () => {};
export const green = (x) => chalk.greenBright.bold(x);
export const pink = (x) => chalk.bgMagenta.bold.cyan.bold(x);
export const id = (x) => x;
export const always = (x) => () => x; // Wraps a value in a fn. Eager evaluation if passed a fn.
export const lazyF = (f) => () => f(); // Wraps a fn, in a fn, and executes it later.
export const pretty = (x) => JSON.stringify(x, null, 2);
export const flat = (xs) => xs.reduce((acc, x) => acc.concat(x), []); // Joins arrays
export const flatMap = (f) => (xs) => xs.reduce((acc, x) => acc.concat(f(x)), []); // Joins arrays with a transformation fn.
export const ccMark = '[CoverageIngestion]';
export const taMark = '[TeamAssignment]';
