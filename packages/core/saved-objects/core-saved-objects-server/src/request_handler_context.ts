/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectsExporter } from './export';
import type { ISavedObjectsImporter } from './import';
import type { ISavedObjectTypeRegistry } from './type_registry';
import type { SavedObjectsClientProviderOptions } from './client_factory';

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
