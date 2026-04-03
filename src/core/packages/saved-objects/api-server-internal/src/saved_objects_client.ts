/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type SavedObject, SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';
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
  SavedObjectsChangeAccessControlResponse,
  SavedObjectsChangeAccessControlObject,
  SavedObjectsChangeAccessModeOptions,
  SavedObjectsChangeOwnershipOptions,
  SavedObjectsRawDocSource,
  SavedObjectsSearchOptions,
  SavedObjectsSearchResponse,
} from '@kbn/core-saved-objects-api-server';

/**
 * Core internal implementation of {@link SavedObjectsClientContract}
 * @internal
 */
export class SavedObjectsClient implements SavedObjectsClientContract {
  public static errors = SavedObjectsErrorHelpers;
  public errors = SavedObjectsErrorHelpers;

  private _repository: ISavedObjectsRepository;
  private _request?: KibanaRequest;

  /** @internal */
  constructor(repository: ISavedObjectsRepository, request?: KibanaRequest) {
    this._repository = repository;
    this._request = request;
  }

  /** {@inheritDoc SavedObjectsClientContract.create} */
  async create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions) {
    const timer = this._request?.serverTiming.start('so-create', type);
    try {
      return await this._repository.create(type, attributes, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkCreate} */
  async bulkCreate<T = unknown>(
    objects: Array<SavedObjectsBulkCreateObject<T>>,
    options?: SavedObjectsCreateOptions
  ) {
    const timer = this._request?.serverTiming.start('so-bulk-create');
    try {
      return await this._repository.bulkCreate(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.checkConflicts} */
  async checkConflicts(
    objects: SavedObjectsCheckConflictsObject[] = [],
    options: SavedObjectsBaseOptions = {}
  ): Promise<SavedObjectsCheckConflictsResponse> {
    const timer = this._request?.serverTiming.start('so-check-conflicts');
    try {
      return await this._repository.checkConflicts(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.delete} */
  async delete(type: string, id: string, options: SavedObjectsDeleteOptions = {}) {
    const timer = this._request?.serverTiming.start('so-delete', type);
    try {
      return await this._repository.delete(type, id, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkDelete} */
  async bulkDelete(
    objects: SavedObjectsBulkDeleteObject[],
    options: SavedObjectsBulkDeleteOptions = {}
  ): Promise<SavedObjectsBulkDeleteResponse> {
    const timer = this._request?.serverTiming.start('so-bulk-delete');
    try {
      return await this._repository.bulkDelete(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.find} */
  async find<T = unknown, A = unknown>(
    options: SavedObjectsFindOptions
  ): Promise<SavedObjectsFindResponse<T, A>> {
    const timer = this._request?.serverTiming.start('so-find');
    try {
      return await this._repository.find(options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.search} */
  async search<T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, A = unknown>(
    options: SavedObjectsSearchOptions
  ): Promise<SavedObjectsSearchResponse<T, A>> {
    const timer = this._request?.serverTiming.start('so-search');
    try {
      return await this._repository.search(options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkGet} */
  async bulkGet<T = unknown>(
    objects: SavedObjectsBulkGetObject[] = [],
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObjectsBulkResponse<T>> {
    const timer = this._request?.serverTiming.start('so-bulk-get');
    try {
      return await this._repository.bulkGet(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.get} */
  async get<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsGetOptions = {}
  ): Promise<SavedObject<T>> {
    const timer = this._request?.serverTiming.start('so-get', type);
    try {
      return await this._repository.get(type, id, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkResolve} */
  async bulkResolve<T = unknown>(
    objects: SavedObjectsBulkResolveObject[],
    options?: SavedObjectsResolveOptions
  ): Promise<SavedObjectsBulkResolveResponse<T>> {
    const timer = this._request?.serverTiming.start('so-bulk-resolve');
    try {
      return await this._repository.bulkResolve(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.resolve} */
  async resolve<T = unknown>(
    type: string,
    id: string,
    options: SavedObjectsResolveOptions = {}
  ): Promise<SavedObjectsResolveResponse<T>> {
    const timer = this._request?.serverTiming.start('so-resolve', type);
    try {
      return await this._repository.resolve(type, id, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.update} */
  async update<T = unknown>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: SavedObjectsUpdateOptions<T> = {}
  ): Promise<SavedObjectsUpdateResponse<T>> {
    const timer = this._request?.serverTiming.start('so-update', type);
    try {
      return await this._repository.update(type, id, attributes, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.bulkUpdate} */
  async bulkUpdate<T = unknown>(
    objects: Array<SavedObjectsBulkUpdateObject<T>>,
    options?: SavedObjectsBulkUpdateOptions
  ): Promise<SavedObjectsBulkUpdateResponse<T>> {
    const timer = this._request?.serverTiming.start('so-bulk-update');
    try {
      return await this._repository.bulkUpdate(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.removeReferencesTo} */
  async removeReferencesTo(
    type: string,
    id: string,
    options?: SavedObjectsRemoveReferencesToOptions
  ) {
    const timer = this._request?.serverTiming.start('so-remove-refs', type);
    try {
      return await this._repository.removeReferencesTo(type, id, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.openPointInTimeForType} */
  async openPointInTimeForType(
    type: string | string[],
    options: SavedObjectsOpenPointInTimeOptions = {}
  ) {
    const timer = this._request?.serverTiming.start('so-open-pit');
    try {
      return await this._repository.openPointInTimeForType(type, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.closePointInTime} */
  async closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions) {
    const timer = this._request?.serverTiming.start('so-close-pit');
    try {
      return await this._repository.closePointInTime(id, options);
    } finally {
      timer?.end();
    }
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
    const timer = this._request?.serverTiming.start('so-collect-refs');
    try {
      return await this._repository.collectMultiNamespaceReferences(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.updateObjectsSpaces} */
  async updateObjectsSpaces(
    objects: SavedObjectsUpdateObjectsSpacesObject[],
    spacesToAdd: string[],
    spacesToRemove: string[],
    options?: SavedObjectsUpdateObjectsSpacesOptions
  ) {
    const timer = this._request?.serverTiming.start('so-update-spaces');
    try {
      return await this._repository.updateObjectsSpaces(
        objects,
        spacesToAdd,
        spacesToRemove,
        options
      );
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.getCurrentNamespace} */
  getCurrentNamespace() {
    return this._repository.getCurrentNamespace();
  }

  /** {@inheritDoc SavedObjectsClientContract.asScopedToNamespace} */
  asScopedToNamespace(namespace: string) {
    return new SavedObjectsClient(this._repository.asScopedToNamespace(namespace), this._request);
  }

  /** {@inheritDoc SavedObjectsClientContract.changeOwnership} */
  async changeOwnership(
    objects: SavedObjectsChangeAccessControlObject[],
    options: SavedObjectsChangeOwnershipOptions
  ): Promise<SavedObjectsChangeAccessControlResponse> {
    const timer = this._request?.serverTiming.start('so-change-owner');
    try {
      return await this._repository.changeOwnership(objects, options);
    } finally {
      timer?.end();
    }
  }

  /** {@inheritDoc SavedObjectsClientContract.changeAccessMode} */
  async changeAccessMode(
    objects: SavedObjectsChangeAccessControlObject[],
    options: SavedObjectsChangeAccessModeOptions
  ): Promise<SavedObjectsChangeAccessControlResponse> {
    const timer = this._request?.serverTiming.start('so-change-access');
    try {
      return await this._repository.changeAccessMode(objects, options);
    } finally {
      timer?.end();
    }
  }
}
