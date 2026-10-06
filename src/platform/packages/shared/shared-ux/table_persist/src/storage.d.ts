/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type IStorageEngine = typeof window.localStorage;
declare class Storage {
  engine: IStorageEngine;
  prefix: string;
  encode(val: unknown): string;
  decode(val: string | null): any;
  encodeKey(key: string): string;
  set(key: string, val: unknown): unknown;
  has(key: string): boolean;
  get<T>(key: string, _default?: T): any;
}
export declare function createStorage(): Storage;
export {};
