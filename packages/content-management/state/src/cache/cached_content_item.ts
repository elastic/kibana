/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, ReplaySubject } from 'rxjs';
import type { ContentType } from '../registry';
import type { ContentItem } from '../registry/content_item';
import type { ContentCache } from './content_cache';
import type { CmCachedItem } from './types';

export class CachedContentItem<T = unknown> implements CmCachedItem<T> {
  public readonly data$ = new ReplaySubject<ContentItem<T>>(1);

  constructor(public readonly id: string, protected readonly cache: ContentCache) {}

  public getType(): string {
    return this.id.split(':')[0];
  }

  public getId(): string {
    return this.id.split(':')[1];
  }

  public contentType(): ContentType {
    const type = this.cache.registry.get(this.getType());
    if (!type) throw new Error(`Unknown content type: ${this.getType()}`);
    return type;
  }

  public async load(): Promise<void> {
    const type = this.contentType();
    const itemId = this.getId();
    const item = (await type.read(itemId)) as ContentItem<T>;
    this.data$.next(item);
  }

  public refresh(): void {
    this.load().catch(() => {});
  }

  public async getData(): Promise<ContentItem<T>> {
    return await firstValueFrom(this.data$);
  }

  public setData(item: ContentItem<T>): void {
    this.data$.next(item);
  }
}
