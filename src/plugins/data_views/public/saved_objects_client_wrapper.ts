/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentClient } from '@kbn/content-management-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
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
  DataViewUpdateOptions,
  CreateOptions,
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
      query: options,
    });
    return results.savedObjects;
  }

  async get(id: string) {
    let response: DataViewGetOut;
    try {
      response = await this.contentManagemntClient.get<DataViewGetIn, DataViewGetOut>({
        contentTypeId: 'index-pattern',
        id,
      });
    } catch (e) {
      if (e.output?.statusCode === 404) {
        throw new SavedObjectNotFound('data view', id, 'management/kibana/dataViews');
      } else {
        throw e;
      }
    }

    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.savedObject;
  }

  async getSavedSearch(id: string) {
    const response = await this.contentManagemntClient.get({
      contentTypeId: 'search',
      id,
    });

    // todo
    // @ts-ignore
    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    // @ts-ignore
    return response.savedObject;
  }

  // SO update method took a `version` value via the options object.
  // This was used to make sure the update was based on the most recent version of the object.
  async update(id: string, attributes: DataViewAttributes, options: DataViewUpdateOptions) {
    const response = await this.contentManagemntClient.update<DataViewUpdateIn, DataViewUpdateOut>({
      contentTypeId: 'index-pattern',
      id,
      data: attributes,
      options,
    });
    return response as SavedObject<DataViewAttributes>;
  }

  async create(attributes: DataViewAttributes, options: CreateOptions) {
    return (await this.contentManagemntClient.create<DataViewCreateIn, DataViewCreateOut>({
      contentTypeId: 'index-pattern',
      data: attributes,
      // this is required, shouldn't be.
      options,
    })) as SavedObject<DataViewAttributes>;
  }

  async delete(id: string) {
    await this.contentManagemntClient.delete<DataViewDeleteIn, DataViewDeleteOut>({
      contentTypeId: 'index-pattern',
      id,
    });
  }
}
