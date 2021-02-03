/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { omit } from 'lodash';
import { SavedObjectsClient, SimpleSavedObject } from 'src/core/public';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
  SavedObject,
} from '../../common/index_patterns';

type SOClient = Pick<SavedObjectsClient, 'find' | 'get' | 'update' | 'create' | 'delete'>;

const simpleSavedObjectToSavedObject = <T>(simpleSavedObject: SimpleSavedObject): SavedObject<T> =>
  ({
    version: simpleSavedObject._version,
    ...omit(simpleSavedObject, '_version'),
  } as any);

export class SavedObjectsClientPublicToCommon implements SavedObjectsClientCommon {
  private savedObjectClient: SOClient;
  constructor(savedObjectClient: SOClient) {
    this.savedObjectClient = savedObjectClient;
  }
  async find<T = unknown>(options: SavedObjectsClientCommonFindArgs) {
    const response = (await this.savedObjectClient.find<T>(options)).savedObjects;
    return response.map<SavedObject<T>>(simpleSavedObjectToSavedObject);
  }

  async get<T = unknown>(type: string, id: string) {
    const response = await this.savedObjectClient.get<T>(type, id);
    return simpleSavedObjectToSavedObject<T>(response);
  }
  async update(
    type: string,
    id: string,
    attributes: Record<string, any>,
    options: Record<string, any>
  ) {
    const response = await this.savedObjectClient.update(type, id, attributes, options);
    return simpleSavedObjectToSavedObject(response);
  }
  async create(type: string, attributes: Record<string, any>, options: Record<string, any>) {
    const response = await this.savedObjectClient.create(type, attributes, options);
    return simpleSavedObjectToSavedObject(response);
  }
  delete(type: string, id: string) {
    return this.savedObjectClient.delete(type, id);
  }
}
