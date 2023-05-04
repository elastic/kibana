/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type SavedObject, SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsClientContract,
  ISavedObjectsRepository,
  SavedObjectsBaseOptions,
  SavedObjectsBulkResponse,
  SavedObjectsUpdateResponse,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsBulkUpdateObject,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsResolveOptions,
  SavedObjectsResolveResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsGetOptions,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponse,
} from '@kbn/core-saved-objects-api-server';

/**
 * Core internal implementation of {@link SavedObjectsClientContract}
 * @internal
 */
export class SavedObjectsClient implements SavedObjectsClientContract {
  public static errors = SavedObjectsErrorHelpers;
  public errors = SavedObjectsErrorHelpers;

  private _repository: ISavedObjectsRepository;

  /** @internal */
  constructor(repository: ISavedObjectsRepository) {
    this._repository = repository;
  }

  /** {@inheritDoc SavedObjectsClientContract.create} */
  async create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions) {
    return await this._repository.create(type, attributes, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkCreate} */
  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    return await this._repository.bulkCreate(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.checkConflicts} */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    return await this._repository.checkConflicts(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.delete} */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}) {
    return await this._repository.delete(type, id, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkDelete} */
  async bulkDelete(
    objects: SavedObjectsBulkDeleteObject[],
    options: SavedObjectsBulkDeleteOptions = {}
  ): Promise<SavedObjectsBulkDeleteResponse> {
    return await this._repository.bulkDelete(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.find} */
  async find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T, A>> {
    return await this._repository.find(options);
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkGet} */
  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    return await this._repository.bulkGet(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.get} */
  async get<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObject<T>> {
    return await this._repository.get(type, id, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkResolve} */
  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options?: SavedObjectsResolveOptions
  ): Promise<SavedObjectsBulkResolveResponse<T>> {
    return await this._repository.bulkResolve(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.resolve} */
  async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsResolveOptions = {}
  ): Promise<SavedObjectsResolveResponse<T>> {
    return await this._repository.resolve(type, id, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.update} */
  async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions<T> = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    return await this._repository.update(type, id, attributes, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkUpdate} */
  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    return await this._repository.bulkUpdate(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.removeReferencesTo} */
  async removeReferencesTo(
    type: string,
    id: string,
    options?: SavedObjectsRemoveReferencesToOptions
  ) {
    return await this._repository.removeReferencesTo(type, id, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.openPointInTimeForType} */
  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {}
  ) {
    return await this._repository.openPointInTimeForType(type, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.closePointInTime} */
  async closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions) {
    return await this._repository.closePointInTime(id, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.createPointInTimeFinder} */
  createPointInTimeFinder<T = unknown, A = unknown>(
    findOptions: SavedObjectsCreatePointInTimeFinderOptions,
    dependencies?: SavedObjectsCreatePointInTimeFinderDependencies
  ): ISavedObjectsPointInTimeFinder<T, A> {
    return this._repository.createPointInTimeFinder(findOptions, {
      client: this,
      // Include dependencies last so that SO client wrappers have their settings applied.
      ...dependencies,
    });
  }

  /** {@inheritDoc SavedObjectsClientContract.collectMultiNamespaceReferences} */
  async collectMultiNamespaceReferences(
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[],
    options?: SavedObjectsCollectMultiNamespaceReferencesOptions
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    return await this._repository.collectMultiNamespaceReferences(objects, options);
  }

  /** {@inheritDoc SavedObjectsClientContract.updateObjectsSpaces} */
  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ) {
    return await this._repository.updateObjectsSpaces(
      objects,
      spacesToAdd,
      spacesToRemove,
      options
    );
  }

  /** {@inheritDoc SavedObjectsClientContract.getCurrentNamespace} */
  getCurrentNamespace() {
    return this._repository.getCurrentNamespace();
  }
}
