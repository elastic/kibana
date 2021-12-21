/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export { registerRoutes } from './register_routes';

export function getDocID(hi: bigint, lo: bigint) {
  let hex = hi.toString(16);
  const hexLo = lo.toString(16);
  hex = '0'.repeat(16 - hex.length) + hex;
  hex = hex + '0'.repeat(16 - hexLo.length) + hexLo;

  const bin = [];
  let i = 0;
  let d;
  let b;
  while (i < hex.length) {
    d = parseInt(hex.slice(i, i + 2), 16);
    b = String.fromCharCode(d);
    bin.push(b);
    i += 2;
  }

  return btoa(bin.join('')).replace('+', '-').replace('/', '_');
}
