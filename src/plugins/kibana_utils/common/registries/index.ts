/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface KbnRegistryItemLoader<TItem extends KbnRegistryItem> {
  id: string;
  load: () => Promise<TItem>;
}

export interface KbnRegistryItem {
  id: string;
}

function isLoader<TItem extends KbnRegistryItem, TLoader extends KbnRegistryItemLoader<TItem>>(
  itemOrLoader: TItem | TLoader
): itemOrLoader is TLoader {
  return 'load' in itemOrLoader;
}

export interface KbnRegistrySetup<
  TItem extends KbnRegistryItem,
  TLoader extends KbnRegistryItemLoader<TItem>
> {
  register(itemOrLoader: TItem | TLoader): void;
}

export interface KbnRegistryStart<
  TItem extends KbnRegistryItem,
  TLoader extends KbnRegistryItemLoader<TItem>
> {
  preloadAll(): Promise<void>;

  preload(id: string | string[]): Promise<void>;

  get(id: string): TItem | undefined;
  has(id: string): boolean;

  getAll(): TItem[];

  load(id: string): Promise<TItem>;
  isLoaded(id: string): boolean;
}

export class KbnRegistry<
  TItem extends KbnRegistryItem,
  TLoader extends KbnRegistryItemLoader<TItem> = KbnRegistryItemLoader<TItem>
> implements KbnRegistrySetup<TItem, TLoader>, KbnRegistryStart<TItem, TLoader> {
  private readonly itemLoaders = new Map<string, TLoader>();
  private readonly items = new Map<string, TItem>();

  register(itemOrLoader: TItem | TLoader) {
    if (isLoader(itemOrLoader)) {
      this.itemLoaders.set(itemOrLoader.id, itemOrLoader);
    } else {
      this.items.set(itemOrLoader.id, itemOrLoader);
    }
  }

  async preloadAll(): Promise<void> {
    await Promise.all(Array.from(this.itemLoaders.keys()).map((id) => this.load(id)));
  }

  async preload(idOrIds: string | string[]): Promise<void> {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    await Promise.all(ids.map((id) => this.load(id)));
  }

  get(id: string): TItem | undefined {
    if (this.itemLoaders.has(id) && !this.items.has(id)) throw new Error('Not loaded yet');
    return this.items.get(id)!;
  }

  getAll(): TItem[] {
    return Array.from(this.items.values());
  }

  has(id: string): boolean {
    return this.items.has(id) || this.itemLoaders.has(id);
  }

  async load(id: string): Promise<TItem> {
    if (this.items.has(id)) return this.items.get(id)!;
    if (!this.itemLoaders.has(id)) throw new Error('Not exists');
    const item = await this.itemLoaders.get(id)!.load();
    this.items.set(id, item);
    return item;
  }

  isLoaded(id: string): boolean {
    return this.items.has(id);
  }
}
