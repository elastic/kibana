/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import {
  DataViewAttributes,
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
} from '../common/types';
import { DataViewSavedObjectConflictError } from '../common/errors';

export class SavedObjectsClientServerToCommon implements SavedObjectsClientCommon {
  private savedObjectClient: SavedObjectsClientContract;
  constructor(savedObjectClient: SavedObjectsClientContract) {
    this.savedObjectClient = savedObjectClient;
  }
  async find<T = unknown>(options: SavedObjectsClientCommonFindArgs) {
    const result = await this.savedObjectClient.find<T>(options);
    return result.saved_objects;
  }

  async get<T = unknown>(id: string) {
    const response = await this.savedObjectClient.resolve<T>('index-pattern', id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.saved_object;
  }
  async update(id: string, attributes: DataViewAttributes, options: {}) {
    return (await this.savedObjectClient.update(
      'index-pattern',
      id,
      attributes,
      options
    )) as SavedObject;
  }
  async create(attributes: DataViewAttributes, options: {}) {
    return await this.savedObjectClient.create('index-pattern', attributes, options);
  }
  async delete(id: string) {
    await this.savedObjectClient.delete('index-pattern', id, { force: true });
  }
}
