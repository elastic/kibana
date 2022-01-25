/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import { SavedObjectsClient, SimpleSavedObject, SavedObjectAttributes } from 'src/core/public';
import {
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
  SavedObject,
  DataViewSavedObjectConflictError,
} from '../common';

type SOClient = Pick<SavedObjectsClient, 'find' | 'resolve' | 'update' | 'create' | 'delete'>;

const simpleSavedObjectToSavedObject = <T extends SavedObjectAttributes>(
  simpleSavedObject: SimpleSavedObject
): SavedObject<T> =>
  ({
    version: simpleSavedObject._version,
    ...omit(simpleSavedObject, '_version'),
  } as any);

export class SavedObjectsClientPublicToCommon implements SavedObjectsClientCommon {
  private savedObjectClient: SOClient;

  constructor(savedObjectClient: SOClient) {
    this.savedObjectClient = savedObjectClient;
  }

  async find<T extends SavedObjectAttributes = SavedObjectAttributes>(
    options: SavedObjectsClientCommonFindArgs
  ) {
    const response = (await this.savedObjectClient.find<T>(options)).savedObjects;
    return response.map<SavedObject<T>>(simpleSavedObjectToSavedObject);
  }

  async get<T extends SavedObjectAttributes = SavedObjectAttributes>(type: string, id: string) {
    const response = await this.savedObjectClient.resolve<T>(type, id);
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return simpleSavedObjectToSavedObject<T>(response.saved_object);
  }

  async update<T extends SavedObjectAttributes = SavedObjectAttributes>(
    type: string,
    id: string,
    attributes: Partial<T>,
    options: Record<string, any>
  ) {
    const response = await this.savedObjectClient.update(type, id, attributes, options);
    return simpleSavedObjectToSavedObject<T>(response);
  }

  async create<T extends SavedObjectAttributes = SavedObjectAttributes>(
    type: string,
    attributes: T,
    options: Record<string, any>
  ) {
    const response = await this.savedObjectClient.create(type, attributes, options);
    return simpleSavedObjectToSavedObject<T>(response);
  }

  delete(type: string, id: string) {
    return this.savedObjectClient.delete(type, id);
  }
}
