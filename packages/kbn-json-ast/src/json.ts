/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function redent(text: string, spaces: string) {
  return text
    .split('\n')
    .map((l, i) => (i === 0 ? l : `${spaces}${l}`))
    .join('\n');
}

export function stringify(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export function redentJson(obj: any, spaces: string = '  ') {
  return redent(stringify(obj), spaces);
}
