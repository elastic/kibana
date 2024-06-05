/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

let seq = 0;
const pid = String(process.pid);

function generateId(seed?: string, length: number = 32) {
  if (seed) {
    return seed.padStart(length, '0');
  }

  const id = String(seq++);
  return pid + id.padStart(length - pid.length, '0');
}

export function generateShortId(seed?: string) {
  return generateId(seed, 16);
}

export function generateLongId(seed?: string) {
  return generateId(seed, 32);
}
