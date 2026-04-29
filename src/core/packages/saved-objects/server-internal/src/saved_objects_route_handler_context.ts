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
export class CoreSavedObjectsRouteHandlerContext implements SavedObjectsRequestHandlerContext {
  constructor(
    private readonly savedObjectsStart: InternalSavedObjectsServiceStart,
    private readonly request: KibanaRequest
  ) {}

  #scopedSavedObjectsClient?: SavedObjectsClientContract;
  #typeRegistry?: ISavedObjectTypeRegistry;

  public get client() {
    if (this.#scopedSavedObjectsClient == null) {
      this.#scopedSavedObjectsClient = this.savedObjectsStart.getScopedClient(this.request);
    }
    return this.#scopedSavedObjectsClient;
  }

  public get typeRegistry() {
    if (this.#typeRegistry == null) {
      this.#typeRegistry = this.savedObjectsStart.getTypeRegistry();
    }
    return this.#typeRegistry;
  }

  public getClient = (options?: SavedObjectsClientProviderOptions) => {
    if (!options) return this.client;
    return this.savedObjectsStart.getScopedClient(this.request, options);
  };

  public getExporter = (client: SavedObjectsClientContract) => {
    return this.savedObjectsStart.createExporter(client);
  };

  public getImporter = (client: SavedObjectsClientContract) => {
    return this.savedObjectsStart.createImporter(client);
  };
}
