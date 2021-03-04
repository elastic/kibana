/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export class Registry<ItemSpec, Item> {
  constructor(prop?: string);

  public wrapper(obj: ItemSpec): Item;

  public register(fn: () => ItemSpec): void;

  public toJS(): { [key: string]: any };

  public toArray(): Item[];

  public get(name: string): Item;

  public getProp(): string;

  public reset(): void;
}
