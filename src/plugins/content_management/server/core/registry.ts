/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentCrud } from './crud';
import { EventBus } from './event_bus';
import type { ContentStorage, ContentConfig, Content } from './types';

export class ContentRegistry {
  private contents = new Map<string, Content>();

  constructor(private eventBus: EventBus) {}

  /**
   * Register a new content in the registry.
   *
   * @param contentType The content type to register
   * @param config The content configuration
   */
  register<S extends ContentStorage = ContentStorage>(
    contentType: string,
    config: ContentConfig<S>
  ) {
    if (this.contents.has(contentType)) {
      throw new Error(`Content [${contentType}] is already registered`);
    }

    this.contents.set(contentType, {
      config,
      crud: new ContentCrud(contentType, config.storage, {
        eventBus: this.eventBus,
      }),
    });
  }

  getContent(contentType: string): Content {
    const content = this.contents.get(contentType);
    if (!content) {
      throw new Error(`Content [${contentType}] is not registered.`);
    }
    return content;
  }

  getStorage(contentType: string) {
    return this.getContent(contentType).config.storage;
  }

  getConfig(contentType: string) {
    return this.getContent(contentType).config;
  }

  getCrud(contentType: string) {
    return this.getContent(contentType).crud;
  }

  isContentRegistered(contentType: string): boolean {
    return this.contents.has(contentType);
  }
}
