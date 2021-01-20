/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Convert a value to a presentable string
 */
export function asPrettyString(val: any): string {
  if (val === null || val === undefined) return ' - ';
  switch (typeof val) {
    case 'string':
      return val;
    case 'object':
      return JSON.stringify(val, null, '  ');
    default:
      return '' + val;
  }
}
