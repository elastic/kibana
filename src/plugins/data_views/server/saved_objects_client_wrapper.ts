/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
  DataViewSavedObjectConflictError,
} from '../common';

export class SavedObjectsClientServerToCommon implements SavedObjectsClientCommon {
  private savedObjectClient: SavedObjectsClientContract;
  constructor(savedObjectClient: SavedObjectsClientContract) {
    this.savedObjectClient = savedObjectClient;
  }
  async find<T = unknown>(options: SavedObjectsClientCommonFindArgs) {
    const result = await this.savedObjectClient.find<T>(options);
    return result.saved_objects;
  }

  async get<T = unknown>(type: string, id: string) {
    const response = await this.savedObjectClient.resolve<T>(type, id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.saved_object;
  }
  async update(
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) {
    return (await this.savedObjectClient.update(type, id, attributes, options)) as SavedObject;
  }
  async create(type: string, attributes: Record<string, any>, options: Record<string, any>) {
    return await this.savedObjectClient.create(type, attributes, options);
  }
  delete(type: string, id: string) {
    return this.savedObjectClient.delete(type, id, { force: true });
  }
}
