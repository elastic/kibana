/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare class Registry<ItemSpec, Item> {
  private readonly _prop;
  private _indexed;
  constructor(prop?: string);
  wrapper(obj: ItemSpec): Item;
  register(fn: () => ItemSpec): void;
  toJS(): {
    [key: string]: any;
  };
  toArray(): Item[];
  get(name: string): Item;
  getProp(): string;
  reset(): void;
}
