/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentType } from './content_type';
import type { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition, MSearchConfig } from './types';
import type { ContentCrud } from './crud';
export declare class ContentRegistry {
  private eventBus;
  private types;
  constructor(eventBus: EventBus);
  /**
   * Register a new content in the registry.
   *
   * @param contentType The content type to register
   * @param config The content configuration
   */
  register<S extends ContentStorage<any, any, MSearchConfig<any, any>> = ContentStorage>(
    definition: ContentTypeDefinition<S>
  ): {
    /**
     * Client getters to interact with the registered content type.
     */
    contentClient: {
      getForRequest: <T = unknown>({
        request,
        requestHandlerContext,
        version,
      }: {
        request: import('@kbn/core/server').KibanaRequest;
        requestHandlerContext: import('@kbn/core/server').RequestHandlerContext;
        version?: import('@kbn/object-versioning').Version;
      }) => import('../content_client').IContentClient<T>;
    };
  };
  getContentType(id: string): ContentType;
  /** Get the definition for a specific content type */
  getDefinition(
    id: string
  ): ContentTypeDefinition<ContentStorage<unknown, unknown, MSearchConfig<unknown, unknown>>>;
  /** Get the crud instance of a content type */
  getCrud<T = unknown>(id: string): ContentCrud<T>;
  /** Helper to validate if a content type has been registered */
  isContentRegistered(id: string): boolean;
}
