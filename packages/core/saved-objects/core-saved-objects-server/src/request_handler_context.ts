/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { ISavedObjectsExporter } from './export';
import { ISavedObjectsImporter } from './import';
import { ISavedObjectTypeRegistry } from './type_registry';
import { SavedObjectsClientProviderOptions } from './client_factory';

/**
 * Core's `savedObjects` request handler context.
 * @public
 */
export interface SavedObjectsRequestHandlerContext {
  client: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
  getExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
  getImporter: (client: SavedObjectsClientContract) => ISavedObjectsImporter;
}
