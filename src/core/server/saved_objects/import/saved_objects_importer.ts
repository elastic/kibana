/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract } from '../types';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { importSavedObjectsFromStream } from './import_saved_objects';
import { resolveSavedObjectsImportErrors } from './resolve_import_errors';
import {
  SavedObjectsImportResponse,
  SavedObjectsImportOptions,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsImportHook,
} from './types';

/**
 * Utility class used to import savedObjects.
 *
 * @public
 */
export interface ISavedObjectsImporter {
  /**
   * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
   * detailed information.
   *
   * @throws SavedObjectsImportError
   */
  import(options: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse>;

  /**
   * Resolve and return saved object import errors.
   * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed information.
   *
   * @throws SavedObjectsImportError
   */
  resolveImportErrors(
    options: SavedObjectsResolveImportErrorsOptions
  ): Promise<SavedObjectsImportResponse>;
}

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
  }: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse> {
    return importSavedObjectsFromStream({
      readStream,
      createNewCopies,
      namespace,
      overwrite,
      refresh,
      objectLimit: this.#importSizeLimit,
      savedObjectsClient: this.#savedObjectsClient,
      typeRegistry: this.#typeRegistry,
      importHooks: this.#importHooks,
    });
  }

  public resolveImportErrors({
    readStream,
    createNewCopies,
    namespace,
    retries,
  }: SavedObjectsResolveImportErrorsOptions): Promise<SavedObjectsImportResponse> {
    return resolveSavedObjectsImportErrors({
      readStream,
      createNewCopies,
      namespace,
      retries,
      objectLimit: this.#importSizeLimit,
      savedObjectsClient: this.#savedObjectsClient,
      typeRegistry: this.#typeRegistry,
      importHooks: this.#importHooks,
    });
  }
}
