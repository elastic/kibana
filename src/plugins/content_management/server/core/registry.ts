/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateVersion } from '@kbn/object-versioning/lib/utils';

import { getContentClientFactory } from '../content_client';
import { ContentType } from './content_type';
import { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition, MSearchConfig } from './types';
import type { ContentCrud } from './crud';

export class ContentRegistry {
  private types = new Map<string, ContentType>();

  constructor(private eventBus: EventBus) {}

  /**
   * Register a new content in the registry.
   *
   * @param contentType The content type to register
   * @param config The content configuration
   */
  register<S extends ContentStorage<any, any, MSearchConfig<any, any>> = ContentStorage>(
    definition: ContentTypeDefinition<S>
  ) {
    if (this.types.has(definition.id)) {
      throw new Error(`Content [${definition.id}] is already registered`);
    }

    const { result, value } = validateVersion(definition.version?.latest);
    if (!result) {
      throw new Error(`Invalid version [${definition.version?.latest}]. Must be an integer.`);
    }

    if (value < 1) {
      throw new Error(`Version must be >= 1`);
    }

    const contentType = new ContentType(
      { ...definition, version: { ...definition.version, latest: value } },
      this.eventBus
    );

    this.types.set(contentType.id, contentType);

    const contentClient = getContentClientFactory({ contentRegistry: this })(contentType.id);

    return {
      /**
       * Client getters to interact with the registered content type.
       */
      contentClient,
    };
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
  getCrud<T = unknown>(id: string) {
    return this.getContentType(id).crud as ContentCrud<T>;
  }

  /** Helper to validate if a content type has been registered */
  isContentRegistered(id: string): boolean {
    return this.types.has(id);
  }
}
