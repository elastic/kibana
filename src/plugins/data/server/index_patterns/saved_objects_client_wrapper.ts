/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract, SavedObject } from 'src/core/server';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
  DataViewSavedObjectConflictError,
} from '../../common/index_patterns';
import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../common/';

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
    const response = await this.savedObjectClient.resolve<T>(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.saved_object;
  }
  async update(id: string, attributes: Record<string, any>, options: Record<string, any>) {
    return (await this.savedObjectClient.update(
      INDEX_PATTERN_SAVED_OBJECT_TYPE,
      id,
      attributes,
      options
    )) as SavedObject;
  }
  async create(attributes: Record<string, any>, options: Record<string, any>) {
    return await this.savedObjectClient.create(
      INDEX_PATTERN_SAVED_OBJECT_TYPE,
      attributes,
      options
    );
  }
  delete(id: string) {
    return this.savedObjectClient.delete(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
  }
}
