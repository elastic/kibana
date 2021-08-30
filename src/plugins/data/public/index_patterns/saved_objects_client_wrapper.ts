/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { SavedObjectsClient, SimpleSavedObject } from 'src/core/public';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
  SavedObject,
  DataViewSavedObjectConflictError,
} from '../../common/index_patterns';
import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../common/';

type SOClient = Pick<SavedObjectsClient, 'find' | 'resolve' | 'update' | 'create' | 'delete'>;

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

  async get<T = unknown>(id: string) {
    const response = await this.savedObjectClient.resolve<T>(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return simpleSavedObjectToSavedObject<T>(response.saved_object);
  }
  async update(id: string, attributes: Record<string, any>, options: Record<string, any>) {
    const response = await this.savedObjectClient.update(
      INDEX_PATTERN_SAVED_OBJECT_TYPE,
      id,
      attributes,
      options
    );
    return simpleSavedObjectToSavedObject(response);
  }
  async create(attributes: Record<string, any>, options: Record<string, any>) {
    const response = await this.savedObjectClient.create(
      INDEX_PATTERN_SAVED_OBJECT_TYPE,
      attributes,
      options
    );
    return simpleSavedObjectToSavedObject(response);
  }
  delete(id: string) {
    return this.savedObjectClient.delete(INDEX_PATTERN_SAVED_OBJECT_TYPE, id);
  }
}
