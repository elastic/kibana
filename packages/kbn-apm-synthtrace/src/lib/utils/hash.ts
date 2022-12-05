/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// @ts-expect-error
import fnv from 'fnv-plus';
import { Fields } from '../entity';

export function hashKeysOf<T extends Fields>(source: T, keys: Array<keyof T>) {
  let hashed: string = '';
  for (const key of keys) {
    const value = String(source[key] || '');
    hashed = appendHash(hashed, value || '');
  }
  return hashed;
}

export function appendHash(hash: string, value: string) {
  return fnv.fast1a32(hash + ',' + value);
}
