/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface IStorageWrapper<T = any, S = void> {
  get: (key: string) => T | null;
  set: (key: string, value: T) => S;
  remove: (key: string) => T | null;
  clear: () => void;
}

export interface IStorage<T = any, S = void> {
  getItem: (key: string) => T | null;
  setItem: (key: string, value: T) => S;
  removeItem: (key: string) => T | null;
  clear: () => void;
}
