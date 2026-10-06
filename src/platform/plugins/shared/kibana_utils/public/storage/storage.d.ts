/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IStorage, IStorageWrapper } from './types';
export declare class Storage implements IStorageWrapper {
  store: IStorage;
  constructor(store: IStorage);
  get: (key: string) => any;
  set: (key: string, value: any, includeUndefined?: boolean) => void | false;
  remove: (key: string) => any;
  clear: () => void;
}
