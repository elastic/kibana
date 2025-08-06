/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Fields } from '../entity';

export function hashKeysOf<T extends Fields>(source: T, keys: Array<keyof T>) {
  let hashed: string = '';
  for (const key of keys) {
    const value = String(source[key] || '');
    hashed = appendHash(hashed, value || '');
  }
  return hashed;
}

// this hashing function has same output as fnv-plus
function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    // eslint-disable-next-line no-bitwise
    hash >>>= 0; // Convert to unsigned 32-bit integer
  }
  return hash;
}

export function appendHash(hash: string, value: string) {
  return fnv1a32(hash + ',' + value).toString();
}
