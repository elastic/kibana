/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Fields } from '../entity';

export function hashKeysOf<T extends Fields>(source: T, keys: Array<keyof T>) {
  let hashed: string = '';
  for (const key of keys) {
    const value = String(source[key] || '');
    hashed = appendHash(hashed, value || '');
  }
  return hashed;
}

// this hashing function is the same as fnv-plus
export function fnv1a32(str: string): number {
  /* eslint-disable no-bitwise */
  let i;
  const l = str.length - 3;
  let t0 = 0;
  let v0 = 0x9dc5;
  let t1 = 0;
  let v1 = 0x811c;

  for (i = 0; i < l; ) {
    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 403;
    t1 = v1 * 403;

    t1 += v0 << 8;

    v1 = (t1 + (t0 >>> 16)) & 65535;

    v0 = t0 & 65535;

    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 403;
    t1 = v1 * 403;

    t1 += v0 << 8;

    v1 = (t1 + (t0 >>> 16)) & 65535;

    v0 = t0 & 65535;

    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 403;
    t1 = v1 * 403;

    t1 += v0 << 8;

    v1 = (t1 + (t0 >>> 16)) & 65535;

    v0 = t0 & 65535;

    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 403;
    t1 = v1 * 403;

    t1 += v0 << 8;

    v1 = (t1 + (t0 >>> 16)) & 65535;

    v0 = t0 & 65535;
  }

  while (i < l + 3) {
    v0 ^= str.charCodeAt(i++);
    t0 = v0 * 403;
    t1 = v1 * 403;

    t1 += v0 << 8;

    v1 = (t1 + (t0 >>> 16)) & 65535;

    v0 = t0 & 65535;
  }

  return ((v1 << 16) >>> 0) + v0;
}

export function appendHash(hash: string, value: string) {
  return fnv1a32(hash + ',' + value).toString();
}
