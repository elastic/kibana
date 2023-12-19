/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import { validateVersion } from '@kbn/object-versioning/lib/utils';
import { ContentType } from './content_type';
import { EventBus } from './event_bus';
import type { ContentStorage, ContentTypeDefinition, MSearchConfig, StorageContext } from './types';
import type { ContentCrud } from './crud';
import { SearchIndex } from '../search_index';
import { getStorageContext } from '../rpc/procedures/utils';
import { getServiceObjectTransformFactory } from '../rpc/services_transforms_factory';

export interface GetStorageContextFnParams {
  requestHandlerContext: RequestHandlerContext;
  req: KibanaRequest;
  version?: number;
}
export type GetStorageContextFn = (params: GetStorageContextFnParams) => Promise<StorageContext>;

export class ContentRegistry {
  private types = new Map<string, ContentType>();

  constructor(
    private eventBus: EventBus,
    private searchIndex: SearchIndex,
    private ctx: {
      auth: {
        getCurrentUser: (request: KibanaRequest) => Promise<AuthenticatedUser | null>;
      };
    }
  ) {}

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
      { eventBus: this.eventBus, searchIndex: this.searchIndex }
    );

    this.types.set(contentType.id, contentType);

    if (definition.searchIndex?.indexer) {
      this.searchIndex.registerIndexer(
        contentType.id,
        definition.searchIndex.indexer,
        definition.searchIndex.parser
      );
    }

    const getStorageCtx: GetStorageContextFn = async ({ requestHandlerContext, req, version }) => {
      const currentUser = await this.ctx.auth.getCurrentUser(req);
      return getStorageContext({
        contentTypeId: contentType.id,
        version,
        ctx: {
          requestHandlerContext,
          contentRegistry: this,
          getTransformsFactory: getServiceObjectTransformFactory,
          currentUser,
        },
      });
    };

    return {
      crud: contentType.crud,
      getStorageCtx,
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
