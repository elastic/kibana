/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorage } from '../types';
export declare class HashedItemStore implements IStorage<string, boolean> {
  static readonly PERSISTED_INDEX_KEY = 'kbn.hashedItemsIndex.v1';
  private storage;
  /**
   * HashedItemStore uses objects called indexed items to refer to items that have been persisted
   * in storage. An indexed item is shaped {hash, touched}. The touched date is when the item
   * was last referenced by the browser history.
   */
  constructor(storage: Storage);
  setItem(hash: string, item: string): boolean;
  getItem(hash: string): string | null;
  removeItem(hash: string): string | null;
  clear(): void;
  private ensuredSorting;
  private getIndexedItems;
  private setIndexedItems;
  private getIndexedItem;
  private persistItem;
  private removeOldestItem;
  private touchHash;
}
