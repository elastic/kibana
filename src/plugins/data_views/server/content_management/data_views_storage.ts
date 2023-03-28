/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';

import type { DataViewAttributes } from '../../common';
import type {
  DataViewGetOut,
  DataViewCreateIn,
  DataViewCreateOut,
  CreateOptions,
  DataViewUpdateIn,
  DataViewUpdateOut,
  DataViewUpdateOptions,
  DataViewDeleteOut,
  DataViewSearchOut,
  DataViewSearchQuery,
} from '../../common/content_management';
import { DataViewContentType } from '../../common/content_management';

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
    } = await soClient.resolve<DataViewAttributes>(DataViewContentType, id);

    return { savedObject, aliasPurpose, aliasTargetId, outcome };
  }

  async bulkGet(ctx: StorageContext, ids: string[], options: unknown): Promise<any> {
    // TODO
    return {};
  }

  async create(
    ctx: StorageContext,
    data: DataViewCreateIn['data'],
    options: CreateOptions
  ): Promise<DataViewCreateOut> {
    const { migrationVersion, coreMigrationVersion, references, overwrite } = options!;

    const createOptions = {
      overwrite,
      migrationVersion,
      coreMigrationVersion,
      references,
    };

    const soClient = await savedObjectClientFromRequest(ctx);
    return soClient.create(DataViewContentType, data, createOptions);
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: DataViewUpdateIn['data'],
    options: DataViewUpdateOptions
  ): Promise<DataViewUpdateOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    return soClient.update(DataViewContentType, id, data, options);
  }

  async delete(ctx: StorageContext, id: string): Promise<DataViewDeleteOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(DataViewContentType, id);
    return { status: 'success' };
  }

  async search(ctx: StorageContext, query: DataViewSearchQuery): Promise<DataViewSearchOut> {
    const soClient = await savedObjectClientFromRequest(ctx);

    const {
      page,
      perPage,
      searchFields,
      search,
      fields,
      defaultSearchOperator,
      hasNoReference,
      hasReference,
    } = query;

    const res = await soClient.find<DataViewAttributes>({
      type: DataViewContentType,
      page,
      perPage,
      searchFields,
      search,
      fields,
      defaultSearchOperator,
      hasNoReference,
      hasReference,
    });

    return {
      page: res.page,
      perPage: res.per_page,
      savedObjects: res.saved_objects,
      total: res.total,
    };
  }
}
