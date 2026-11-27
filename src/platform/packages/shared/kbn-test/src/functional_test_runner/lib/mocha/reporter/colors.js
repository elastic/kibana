/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';

export const suite = chalk.bold;
export const pending = chalk.cyan;
export const pass = chalk.green;
export const fail = chalk.red;

export function speed(name, txt) {
  switch (name) {
    case 'fast':
      return chalk.green(txt);
    case 'medium':
      return chalk.yellow(txt);
    case 'slow':
      return chalk.red(txt);
    default:
      return chalk.dim(txt);
  }
}
