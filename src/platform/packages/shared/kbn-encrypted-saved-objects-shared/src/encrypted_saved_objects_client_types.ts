/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ISavedObjectsPointInTimeFinder,
  SavedObject,
  SavedObjectsBaseOptions,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
} from '@kbn/core/server';

export interface EncryptedSavedObjectsClient {
  getDecryptedAsInternalUser: <T = unknown>(
    type: string,
    id: string,
    options?: SavedObjectsBaseOptions
  ) => Promise<SavedObject<T>>;

  /**
   * API method, that can be used to help page through large sets of saved objects and returns decrypted properties in result SO.
   * Its interface matches interface of the corresponding Saved Objects API `createPointInTimeFinder` method:
   *
   * @example
   * ```ts
   * const finder = await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser({
   *   filter,
   *   type: 'my-saved-object-type',
   *   perPage: 1000,
   * });
   * for await (const response of finder.find()) {
   *   // process response
   * }
   * ```
   *
   * @param findOptions matches interface of corresponding argument of Saved Objects API `createPointInTimeFinder` {@link SavedObjectsCreatePointInTimeFinderOptions}
   * @param dependencies matches interface of corresponding argument of Saved Objects API `createPointInTimeFinder` {@link SavedObjectsCreatePointInTimeFinderDependencies}
   *
   */
  createPointInTimeFinderDecryptedAsInternalUser<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ): Promise<ISavedObjectsPointInTimeFinder<T, A>>;
}

export interface EncryptedSavedObjectsClientOptions {
  includedHiddenTypes?: string[];
}
