/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateVersion } from '../../common/utils';
import { ContentType } from './content_type';
import { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition } from './types';

export class ContentRegistry {
  private types = new Map<string, ContentType>();

  constructor(private eventBus: EventBus) {}

  /**
   * Register a new content in the registry.
   *
   * @param contentType The content type to register
   * @param config The content configuration
   */
  register<S extends ContentStorage = ContentStorage>(definition: ContentTypeDefinition<S>) {
    if (this.types.has(definition.id)) {
      throw new Error(`Content [${definition.id}] is already registered`);
    }

    validateVersion(definition.version?.latest);

    const contentType = new ContentType(definition, this.eventBus);

    this.types.set(contentType.id, contentType);
  }

  getContentType(id: string): ContentType {
    const contentType = this.types.get(id);
    if (!contentType) {
      throw new Error(`Content [${id}] is not registered.`);
    }
    return contentType;
  }

  /** Get the definition for a specific content type */
  getDefinition(id: string) {
    return this.getContentType(id).definition;
  }

  /** Get the crud instance of a content type */
  getCrud(id: string) {
    return this.getContentType(id).crud;
  }

  /** Helper to validate if a content type has been registered */
  isContentRegistered(id: string): boolean {
    return this.types.has(id);
  }
}
