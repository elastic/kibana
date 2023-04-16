/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type { SearchQuery } from '@kbn/content-management-plugin/common';

import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { DataViewAttributes } from '../../common';
import type {
  DataViewGetOut,
  DataViewCreateIn,
  DataViewCreateOut,
  DataViewCreateOptions,
  DataViewUpdateIn,
  DataViewUpdateOut,
  DataViewUpdateOptions,
  DataViewDeleteOut,
  DataViewSearchOut,
  DataViewSearchOptions,
} from '../../common/content_management';
import { DataViewSOType } from '../../common/content_management/constants';

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

export class DataViewsStorage implements ContentStorage {
  constructor() {}

  async get(ctx: StorageContext, id: string): Promise<DataViewGetOut> {
    const soClient = await savedObjectClientFromRequest(ctx);

    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<DataViewAttributes>(DataViewSOType, id);

    return { item: savedObject, meta: { aliasPurpose, aliasTargetId, outcome } };
  }

  async bulkGet(ctx: StorageContext, ids: string[], options: unknown): Promise<any> {
    return {};
  }

  async create(
    ctx: StorageContext,
    data: DataViewCreateIn['data'],
    options: DataViewCreateOptions
  ): Promise<DataViewCreateOut> {
    const { references, overwrite, id } = options!;

    const createOptions = {
      id,
      overwrite,
      references,
    };

    const soClient = await savedObjectClientFromRequest(ctx);
    const result = await soClient.create(DataViewSOType, data, createOptions);
    return { item: result };
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: DataViewUpdateIn['data'],
    options: DataViewUpdateOptions
  ): Promise<DataViewUpdateOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    const result = await soClient.update<DataViewUpdateIn['data']>(
      DataViewSOType,
      id,
      data,
      options
    );
    return { item: result };
  }

  async delete(ctx: StorageContext, id: string): Promise<DataViewDeleteOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(DataViewSOType, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: DataViewSearchOptions
  ): Promise<DataViewSearchOut> {
    const soClient = await savedObjectClientFromRequest(ctx);

    const { included, excluded } = query.tags ?? {};
    const hasReference: SavedObjectsFindOptions['hasReference'] = included
      ? included.map((id) => ({
          id,
          type: 'tag',
        }))
      : undefined;

    const hasNoReference: SavedObjectsFindOptions['hasNoReference'] = excluded
      ? excluded.map((id) => ({
          id,
          type: 'tag',
        }))
      : undefined;

    const soQuery: SavedObjectsFindOptions = {
      type: DataViewSOType,
      search: query.text,
      perPage: query.limit,
      page: query.cursor ? +query.cursor : undefined,
      defaultSearchOperator: 'AND',
      searchFields: options.searchFields || ['title', 'name'],
      fields: ['title', 'name', 'type', 'typeMeta'],
      hasReference,
      hasNoReference,
    };

    const res = await soClient.find<DataViewAttributes>(soQuery);

    return {
      hits: res.saved_objects,
      pagination: {
        total: res.total,
      },
    };
  }
}
