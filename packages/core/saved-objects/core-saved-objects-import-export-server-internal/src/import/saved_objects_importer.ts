/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsImporter,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsImportHook,
} from '@kbn/core-saved-objects-server';
import { importSavedObjectsFromStream } from './import_saved_objects';
import { resolveSavedObjectsImportErrors } from './resolve_import_errors';

/**
 * @internal
 */
export class SavedObjectsImporter implements ISavedObjectsImporter {
  readonly #savedObjectsClient: SavedObjectsClientContract;
  readonly #typeRegistry: ISavedObjectTypeRegistry;
  readonly #importSizeLimit: number;
  readonly #importHooks: Record<string, SavedObjectsImportHook[]>;
  readonly #log: Logger;

  constructor({
    savedObjectsClient,
    typeRegistry,
    importSizeLimit,
    logger,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    importSizeLimit: number;
    logger: Logger;
  }) {
    this.#savedObjectsClient = savedObjectsClient;
    this.#typeRegistry = typeRegistry;
    this.#importSizeLimit = importSizeLimit;
    this.#importHooks = typeRegistry.getAllTypes().reduce((hooks, type) => {
      if (type.management?.onImport) {
        hooks[type.name] = [type.management.onImport];
      }
      return hooks;
    }, {} as Record<string, SavedObjectsImportHook[]>);
    this.#log = logger;
  }

  public import({
    readStream,
    createNewCopies,
    namespace,
    overwrite,
    refresh,
    compatibilityMode,
    managed,
  }: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse> {
    // Get the allowed types for import from the typeRegistry
    const allowedTypes = this.#typeRegistry
      .getImportableAndExportableTypes()
      .map((type) => type.name);
    // Log the allowed types, similar to how the exporter logs types
    this.#log.debug(`Initiating import process.`);
    this.#log.debug(`Allowed types: [${allowedTypes.join(', ')}]`);
    this.#log.info(`Import size limit: ${this.#importSizeLimit} saved objects.`);
    const overwriteStatus = overwrite ? 'enabled' : 'disabled';
    this.#log.info(`Automatic overwrite is ${overwriteStatus} for the current import operation.`);
    return importSavedObjectsFromStream({
      readStream,
      createNewCopies,
      namespace,
      overwrite,
      refresh,
      compatibilityMode,
      objectLimit: this.#importSizeLimit,
      savedObjectsClient: this.#savedObjectsClient,
      typeRegistry: this.#typeRegistry,
      importHooks: this.#importHooks,
      managed,
    })
      .then((response: SavedObjectsImportResponse) => {
        this.#log.info(`🌸 Successfully imported ${response.successCount} saved objects.`);
        return response;
      })
      .catch((error) => {
        this.#log.error('Failed to import saved objects');
        const errors = Array.isArray(error) ? error : [error];
        errors.forEach((err) => {
          this.#log.error(`Import error: ${err.message}`);
        });
        throw error;
      });
  }

  public resolveImportErrors({
    readStream,
    createNewCopies,
    compatibilityMode,
    namespace,
    retries,
    managed,
  }: SavedObjectsResolveImportErrorsOptions): Promise<SavedObjectsImportResponse> {
    this.#log.debug('Resolving import errors');
    return resolveSavedObjectsImportErrors({
      readStream,
      createNewCopies,
      compatibilityMode,
      namespace,
      retries,
      objectLimit: this.#importSizeLimit,
      savedObjectsClient: this.#savedObjectsClient,
      typeRegistry: this.#typeRegistry,
      importHooks: this.#importHooks,
      managed,
    });
  }
}
