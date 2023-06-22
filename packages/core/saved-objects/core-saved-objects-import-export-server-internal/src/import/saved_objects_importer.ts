/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
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

  constructor({
    savedObjectsClient,
    typeRegistry,
    importSizeLimit,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    importSizeLimit: number;
  }) {
    this.#savedObjectsClient = savedObjectsClient;
    this.#typeRegistry = typeRegistry;
    this.#importSizeLimit = importSizeLimit;
    this.#importHooks = typeRegistry.getAllTypes().reduce((hooks, type) => {
      if (type.management?.onImport) {
        return {
          ...hooks,
          [type.name]: [type.management.onImport],
        };
      }
      return hooks;
    }, {} as Record<string, SavedObjectsImportHook[]>);
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
