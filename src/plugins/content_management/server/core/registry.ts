/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentStorage, ContentConfig } from './types';

export class ContentRegistry {
  private contents = new Map<string, ContentConfig<ContentStorage>>();

  register<S extends ContentStorage = ContentStorage>(
    contentType: string,
    config: ContentConfig<S>
  ) {
    if (this.contents.has(contentType)) {
      throw new Error(`Content [${contentType}] is already registered`);
    }

    this.contents.set(contentType, config);
  }

  getStorage(contentType: string) {
    const contentConfig = this.contents.get(contentType);
    if (!contentConfig) {
      throw new Error(`Content [${contentType}] is not registered.`);
    }
    return contentConfig.storage;
  }

  getConfig(contentType: string) {
    return this.contents.get(contentType);
  }
}
