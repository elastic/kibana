/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Readable } from 'stream';
import { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectsClientContract, SavedObjectsImportRetry } from '../types';
import { ISavedObjectTypeRegistry } from '../saved_objects_type_registry';
import { importSavedObjectsFromStream } from './import_saved_objects';
import { resolveSavedObjectsImportErrors } from './resolve_import_errors';
import { SavedObjectsImportResponse } from './types';

/**
 * Options to control the import operation.
 * @public
 */
export interface SavedObjectsImportOptions {
  /** The stream of {@link SavedObject | saved objects} to import */
  readStream: Readable;
  /** If true, will override existing object if present. Note: this has no effect when used with the `createNewCopies` option. */
  overwrite: boolean;
  /** if specified, will import in given namespace, else will import as global object */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
}

/**
 * Options to control the "resolve import" operation.
 * @public
 */
export interface SavedObjectsResolveImportErrorsOptions {
  /** The stream of {@link SavedObject | saved objects} to resolve errors from */
  readStream: Readable;
  /** saved object import references to retry */
  retries: SavedObjectsImportRetry[];
  /** if specified, will import in given namespace */
  namespace?: string;
  /** If true, will create new copies of import objects, each with a random `id` and undefined `originId`. */
  createNewCopies: boolean;
}

/**
 * @public
 */
export type ISavedObjectsImporter = PublicMethodsOf<SavedObjectsImporter>;

export class SavedObjectsImporter {
  private savedObjectsClient: SavedObjectsClientContract;
  private typeRegistry: ISavedObjectTypeRegistry;
  private importSizeLimit: number;

  constructor({
    savedObjectsClient,
    typeRegistry,
    importSizeLimit,
  }: {
    savedObjectsClient: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    importSizeLimit: number;
  }) {
    this.savedObjectsClient = savedObjectsClient;
    this.typeRegistry = typeRegistry;
    this.importSizeLimit = importSizeLimit;
  }

  /**
   * Import saved objects from given stream. See the {@link SavedObjectsImportOptions | options} for more
   * detailed information.
   *
   * @public
   */
  async import({
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
      objectLimit: this.importSizeLimit,
      savedObjectsClient: this.savedObjectsClient,
      typeRegistry: this.typeRegistry,
    });
  }

  /**
   * Resolve and return saved object import errors.
   * See the {@link SavedObjectsResolveImportErrorsOptions | options} for more detailed informations.
   *
   * @public
   */
  async resolveImportErrors({
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
      objectLimit: this.importSizeLimit,
      savedObjectsClient: this.savedObjectsClient,
      typeRegistry: this.typeRegistry,
    });
  }
}
