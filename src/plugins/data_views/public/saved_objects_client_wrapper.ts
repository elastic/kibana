/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsCreateOptions, SavedObjectsUpdateOptions } from '@kbn/core/public';

import { ContentClient } from '@kbn/content-management-plugin/public';
import { DataViewSavedObjectConflictError } from '../common/errors';
import {
  DataViewAttributes,
  SavedObject,
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
} from '../common/types';

import type {
  DataViewGetIn,
  DataViewGetOut,
  DataViewCreateIn,
  DataViewCreateOut,
  DataViewUpdateIn,
  DataViewUpdateOut,
  DataViewDeleteIn,
  DataViewDeleteOut,
  DataViewSearchIn,
  DataViewSearchOut,
  // DataViewSearchQuery,
} from '../common/content_management';

export class SavedObjectsClientPublicToCommon implements SavedObjectsClientCommon {
  private contentManagemntClient: ContentClient;

  constructor(contentManagemntClient: ContentClient) {
    this.contentManagemntClient = contentManagemntClient;
  }

  async find(options: SavedObjectsClientCommonFindArgs) {
    const results = await this.contentManagemntClient.search<DataViewSearchIn, DataViewSearchOut>({
      contentTypeId: 'index-pattern',
      query: { search: options.search },
      // ...options,
    });
    return results.savedObjects;
  }

  async get(id: string) {
    const response = await this.contentManagemntClient.get<DataViewGetIn, DataViewGetOut>({
      contentTypeId: 'index-pattern',
      id,
    });

    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.savedObject;
  }

  async update(
    type: string,
    id: string,
    attributes: DataViewAttributes,
    options: SavedObjectsUpdateOptions<unknown>
  ) {
    const response = await this.contentManagemntClient.update<DataViewUpdateIn, DataViewUpdateOut>({
      contentTypeId: 'index-pattern',
      id,
      data: attributes,
      options,
    });
    return response as SavedObject<DataViewAttributes>;
  }

  async create(type: string, attributes: DataViewAttributes, options?: SavedObjectsCreateOptions) {
    return (await this.contentManagemntClient.create<DataViewCreateIn, DataViewCreateOut>({
      contentTypeId: 'index-pattern',
      data: attributes,
      options,
    })) as SavedObject<DataViewAttributes>;
  }

  delete(type: string, id: string) {
    return this.contentManagemntClient.delete<DataViewDeleteIn, DataViewDeleteOut>({
      contentTypeId: 'index-pattern',
      id,
    });
  }
}
