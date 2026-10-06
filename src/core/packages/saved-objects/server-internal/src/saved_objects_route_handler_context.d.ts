/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  SavedObjectsRequestHandlerContext,
  ISavedObjectTypeRegistry,
  SavedObjectsClientProviderOptions,
} from '@kbn/core-saved-objects-server';
import type { InternalSavedObjectsServiceStart } from './saved_objects_service';
/**
 * The {@link SavedObjectsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreSavedObjectsRouteHandlerContext
  implements SavedObjectsRequestHandlerContext
{
  #private;
  private readonly savedObjectsStart;
  private readonly request;
  constructor(savedObjectsStart: InternalSavedObjectsServiceStart, request: KibanaRequest);
  get client(): SavedObjectsClientContract;
  get typeRegistry(): ISavedObjectTypeRegistry;
  getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
  getExporter: (
    client: SavedObjectsClientContract
  ) => import('@kbn/core-saved-objects-server').ISavedObjectsExporter;
  getImporter: (
    client: SavedObjectsClientContract
  ) => import('@kbn/core-saved-objects-server').ISavedObjectsImporter;
}
