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
  DataViewSpec,
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
      query: {
        text: options.search,
        limit: options.perPage,
      },
    });
    return results.hits;
  }

  async get(id: string) {
    let response: DataViewGetOut;
    try {
      response = await this.contentManagemntClient.get<DataViewGetIn, DataViewGetOut>({
        contentTypeId: 'index-pattern',
        id,
      });
    } catch (e) {
      if (e.body?.statusCode === 404) {
        throw new SavedObjectNotFound('data view', id, 'management/kibana/dataViews');
      } else {
        throw e;
      }
    }

    if (response.outcome === 'conflict') {
      throw new DataViewSavedObjectConflictError(id);
    }
    return response.item;
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
  async update(id: string, spec: DataViewSpec, options: DataViewUpdateOptions) {
    const response = await this.contentManagemntClient.update<DataViewUpdateIn, DataViewUpdateOut>({
      contentTypeId: 'index-pattern',
      id,
      data: spec,
      options,
    });
    return response as SavedObject<DataViewAttributes>;
  }

  async create(spec: DataViewSpec, options: CreateOptions) {
    return (await this.contentManagemntClient.create<DataViewCreateIn, DataViewCreateOut>({
      contentTypeId: 'index-pattern',
      data: spec,
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
