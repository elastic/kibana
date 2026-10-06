/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @internal */
export interface IFileHashCache {
  get(key: string): Promise<string> | undefined;
  set(key: string, value: Promise<string>): void;
  del(key: string): void;
}
/** @internal */
export declare class FileHashCache implements IFileHashCache {
  private lru;
  constructor(maxItems?: number);
  get(key: string): Promise<string> | undefined;
  set(key: string, value: Promise<string>): void;
  del(key: string): void;
}
