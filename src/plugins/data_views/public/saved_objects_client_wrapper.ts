/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ContentClient } from '@kbn/content-management-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core/public';
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
  DataViewCreateOptions,
} from '../common/content_management';

import { DataViewSOType } from '../common/content_management';

type SOClient = Pick<SavedObjectsClientContract, 'resolve'>;

export class SavedObjectsClientPublicToCommon implements SavedObjectsClientCommon {
  private contentManagementClient: ContentClient;
  private savedObjectClient: SOClient;

  constructor(contentManagementClient: ContentClient, savedObjectClient: SOClient) {
    this.contentManagementClient = contentManagementClient;
    this.savedObjectClient = savedObjectClient;
  }

  async find(options: SavedObjectsClientCommonFindArgs) {
    const results = await this.contentManagementClient.search<DataViewSearchIn, DataViewSearchOut>({
      contentTypeId: DataViewSOType,
      query: {
        text: options.search,
        limit: options.perPage,
      },
      options: {
        searchFields: options.searchFields,
      },
    });
    return results.hits;
  }

  async get(id: string) {
    let response: DataViewGetOut;
    try {
      response = await this.contentManagementClient.get<DataViewGetIn, DataViewGetOut>({
        contentTypeId: DataViewSOType,
        id,
      });
    } catch (e) {
      if (e.body?.statusCode === 404) {
        throw new SavedObjectNotFound('data view', id, 'management/kibana/dataViews');
      } else {
        throw e;
      }
    }

    if (response.meta.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.item;
  }

  async getSavedSearch(id: string) {
    const response = await this.savedObjectClient.resolve('search', id);

    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.saved_object;
  }

  // SO update method took a `version` value via the options object.
  // This was used to make sure the update was based on the most recent version of the object.
  async update(id: string, attributes: DataViewAttributes, options: DataViewUpdateOptions) {
    const response = await this.contentManagementClient.update<DataViewUpdateIn, DataViewUpdateOut>(
      {
        contentTypeId: DataViewSOType,
        id,
        data: attributes,
        options,
      }
    );

    return response.item as SavedObject<DataViewAttributes>;
  }

  async create(attributes: DataViewAttributes, options: DataViewCreateOptions) {
    const result = await this.contentManagementClient.create<DataViewCreateIn, DataViewCreateOut>({
      contentTypeId: DataViewSOType,
      data: attributes,
      options,
    });

    return result.item;
  }

  async delete(id: string) {
    await this.contentManagementClient.delete<DataViewDeleteIn, DataViewDeleteOut>({
      contentTypeId: DataViewSOType,
      id,
    });
  }
}
