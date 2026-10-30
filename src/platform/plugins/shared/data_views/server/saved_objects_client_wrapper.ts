/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  DataViewAttributes,
  PersistenceAPI,
  SavedObjectsClientCommonFindArgs,
} from '../common/types';
import { DataViewSavedObjectConflictError } from '../common/errors';

import type { DataViewCrudTypes } from '../common/content_management';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../common';

export class SavedObjectsClientWrapper implements PersistenceAPI {
  private savedObjectClient: SavedObjectsClientContract;
  constructor(savedObjectClient: SavedObjectsClientContract) {
    this.savedObjectClient = savedObjectClient;
  }
  async find<T = unknown>(options: SavedObjectsClientCommonFindArgs) {
    const result = await this.savedObjectClient.find<T>({
      ...options,
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
    });
    return result.saved_objects;
  }

  async get<T = unknown>(id: string) {
    const response = await this.savedObjectClient.resolve<T>('index-pattern', id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    if (isSavedObjectErrorResult(response.saved_object)) {
      throw new Error(response.saved_object.error.message);
    }
    return response.saved_object;
  }

  async getSavedSearch<T = unknown>(id: string) {
    const response = await this.savedObjectClient.resolve<T>('search', id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    if (isSavedObjectErrorResult(response.saved_object)) {
      throw new Error(response.saved_object.error.message);
    }
    return response.saved_object;
  }

  async update(id: string, attributes: DataViewAttributes, options: {}) {
    return (await this.savedObjectClient.update(
      DATA_VIEW_SAVED_OBJECT_TYPE,
      id,
      attributes,
      options
    )) as SavedObject;
  }
  async create(attributes: DataViewAttributes, options: DataViewCrudTypes['CreateOptions']) {
    return await this.savedObjectClient.create(DATA_VIEW_SAVED_OBJECT_TYPE, attributes, options);
  }
  async delete(id: string, namespaces?: string[]) {
    if (!namespaces?.length) {
      await this.savedObjectClient.delete(DATA_VIEW_SAVED_OBJECT_TYPE, id, { force: true });
      return;
    }

    // `namespace` can't be passed per call when the spaces extension is enabled, so a client
    // scoped to the target space is used instead. Deleting is only authorized against that
    // space, so fall through the candidates until one is writable by the user.
    let forbiddenError: Error | undefined;
    for (const namespace of namespaces) {
      try {
        await this.savedObjectClient
          .asScopedToNamespace(namespace)
          .delete(DATA_VIEW_SAVED_OBJECT_TYPE, id, { force: true });
        return;
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isForbiddenError(error)) {
          throw error;
        }
        forbiddenError = error;
      }
    }
    throw forbiddenError;
  }
}
