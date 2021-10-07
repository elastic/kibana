/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
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
 * @public
 */
export type ISavedObjectsImporter = PublicMethodsOf<SavedObjectsImporter>;

/**
 * @public
 */
export class SavedObjectsImporter {
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

  /**
   * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
   * detailed information.
   *
   * @throws SavedObjectsImportError
   */
  import({
    readStream,
    createNewCopies,
    namespace,
    overwrite,
  }: SavedObjectsImportOptions): Promise<SavedObjectsImportResponse> {
    return importSavedObjectsFromStream({
      readStream,
      createNewCopies,
      namespace,
      overwrite,
      objectLimit: this.#importSizeLimit,
      savedObjectsClient: this.#savedObjectsClient,
      typeRegistry: this.#typeRegistry,
      importHooks: this.#importHooks,
    });
  }

  /**
   * Resolve and return saved object import errors.
   * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed information.
   *
   * @throws SavedObjectsImportError
   */
  resolveImportErrors({
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
