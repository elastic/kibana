/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import chalk from 'chalk';

export const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)));
export const noop = () => {};
export const green = (x) => chalk.greenBright.bold(x);
export const pink = (x) => chalk.bgMagenta.bold.cyan.bold(x);
export const id = (x) => x;
export const always = (x) => () => x; // Wraps a value in a fn. Eager evaluation if passed a fn.
export const pretty = (x) => JSON.stringify(x, null, 2);
export const reThrow = (e) => {
  throw e;
};
