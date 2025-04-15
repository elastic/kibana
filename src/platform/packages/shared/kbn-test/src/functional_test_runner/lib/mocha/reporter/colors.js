/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { bold, dim, green, yellow, red, cyan } from 'chalk';

export const suite = bold;
export const pending = cyan;
export const pass = green;
export const fail = red;

export function speed(name, txt) {
  switch (name) {
    case 'fast':
      return green(txt);
    case 'medium':
      return yellow(txt);
    case 'slow':
      return red(txt);
    default:
      return dim(txt);
  }
}
