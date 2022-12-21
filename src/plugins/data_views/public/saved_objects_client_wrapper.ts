/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsUpdateOptions,
  SimpleSavedObject,
} from '@kbn/core/public';
import { omit } from 'lodash';
import { DataViewSavedObjectConflictError } from '../common/errors';
import {
  DataViewAttributes,
  SavedObject,
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
} from '../common/types';

type SOClient = Pick<
  SavedObjectsClientContract,
  'find' | 'resolve' | 'update' | 'create' | 'delete'
>;

const simpleSavedObjectToSavedObject = <T>(simpleSavedObject: SimpleSavedObject): SavedObject<T> =>
  ({
    version: simpleSavedObject._version,
    ...omit(simpleSavedObject, '_version'),
  } as SavedObject<T>);

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
    const response = await this.savedObjectClient.resolve<T>(type, id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return simpleSavedObjectToSavedObject<T>(response.saved_object);
  }

  async update(
    type: string,
    id: string,
    attributes: DataViewAttributes,
    options: SavedObjectsUpdateOptions<unknown>
  ) {
    const response = await this.savedObjectClient.update(type, id, attributes, options);
    return simpleSavedObjectToSavedObject(response);
  }

  async create(type: string, attributes: DataViewAttributes, options?: SavedObjectsCreateOptions) {
    const response = await this.savedObjectClient.create(type, attributes, options);
    return simpleSavedObjectToSavedObject(response);
  }

  delete(type: string, id: string) {
    return this.savedObjectClient.delete(type, id, { force: true });
  }
}
