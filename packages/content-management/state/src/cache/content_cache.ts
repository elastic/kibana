/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LruMap } from '@kbn/content-management-utils';
import { CachedContentItem } from './cached_content_item';
import { CachedContentType } from './cached_content_type';
import type { ContentRegistry } from '../registry/content_registry';
import type { CmCache } from './types';

export class ContentCache implements CmCache {
  protected readonly typeCache: Map<string, CachedContentType> = new Map();
  protected readonly itemCache: LruMap<string, CachedContentItem> = new LruMap(5000);

  constructor(public readonly registry: ContentRegistry) {}

  public type(id: string): CachedContentType {
    let type = this.typeCache.get(id);
    if (!type) {
      type = new CachedContentType(id, this);
      this.typeCache.set(id, type);
    }
    return type;
  }

  public item(id: string, refreshIfNew: boolean = true): CachedContentItem {
    let item = this.itemCache.get(id);
    if (!item) {
      item = new CachedContentItem(id, this);
      if (refreshIfNew) item.refresh();
      this.itemCache.set(id, item);
    }
    return item;
  }
}
