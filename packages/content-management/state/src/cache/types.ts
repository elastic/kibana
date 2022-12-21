/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { ContentItem, ContentType } from '../registry';

/**
 * Represents a cache of content items.
 */
export interface CmCache {
  /**
   * Retrieves a reference to a cached content item.
   * @param id Global ID of a content item.
   */
  item(id: string): CmCachedItem;
}

/**
 * Represents a single cached content item.
 */
export interface CmCachedItem<T = unknown> {
  /**
   * Emits actual data of this content item. Can emit multiple times, due to
   * various asynchronous operations that may update the data.
   */
  data$: Observable<ContentItem<T>>;

  /**
   * Retrieves the content type of this content item.
   */
  contentType(): ContentType;
}
