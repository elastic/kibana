/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentClient } from '@kbn/content-management-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core/public';
import { DataViewSavedObjectConflictError } from '../common/errors';
import {
  DataViewAttributes,
  SavedObject,
  SavedObjectsClientCommon,
  SavedObjectsClientCommonFindArgs,
} from '../common/types';

import type { DataViewCrudTypes } from '../common/content_management';

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
    const results = await this.contentManagementClient.search<
      DataViewCrudTypes['SearchIn'],
      DataViewCrudTypes['SearchOut']
    >({
      contentTypeId: DataViewSOType,
      query: {
        text: options.search,
        limit: options.perPage,
      },
      options: {
        searchFields: options.searchFields,
        fields: options.fields,
      },
    });
    return results.hits;
  }

  async get(id: string) {
    let response: DataViewCrudTypes['GetOut'];
    try {
      response = await this.contentManagementClient.get<
        DataViewCrudTypes['GetIn'],
        DataViewCrudTypes['GetOut']
      >({
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

  async update(
    id: string,
    attributes: DataViewAttributes,
    options: DataViewCrudTypes['UpdateOptions']
  ) {
    const response = await this.contentManagementClient.update<
      DataViewCrudTypes['UpdateIn'],
      DataViewCrudTypes['UpdateOut']
    >({
      contentTypeId: DataViewSOType,
      id,
      data: attributes,
      options,
    });

    // cast is necessary since its the full object and not just the changes
    return response.item as SavedObject<DataViewAttributes>;
  }

  async create(attributes: DataViewAttributes, options: DataViewCrudTypes['CreateOptions']) {
    const result = await this.contentManagementClient.create<
      DataViewCrudTypes['CreateIn'],
      DataViewCrudTypes['CreateOut']
    >({
      contentTypeId: DataViewSOType,
      data: attributes,
      options,
    });

    return result.item;
  }

  async delete(id: string) {
    await this.contentManagementClient.delete<
      DataViewCrudTypes['DeleteIn'],
      DataViewCrudTypes['DeleteOut']
    >({
      contentTypeId: DataViewSOType,
      id,
      options: { force: true },
    });
  }
}
