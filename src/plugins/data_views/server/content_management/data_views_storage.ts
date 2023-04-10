/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import Boom from '@hapi/boom';
import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';

import { cmServicesDefinition } from '../../common/content_management/cm_services';

import type { DataViewAttributes, DataViewSpec } from '../../common';
import type {
  DataViewGetOut,
  DataViewCreateIn,
  DataViewCreateOut,
  CreateOptions,
  DataViewUpdateIn,
  DataViewUpdateOptions,
  DataViewSearchOut,
} from '../../common/content_management';
import { DataViewContentType } from '../../common/content_management';
import { savedObjectToDataViewSpec, dataViewSpecToSavedObject } from './utils';

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

export class DataViewsStorage implements ContentStorage<DataViewSpec> {
  constructor() {}

  async get(ctx: StorageContext, id: string) {
    const soClient = await savedObjectClientFromRequest(ctx);

    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<DataViewAttributes>(DataViewContentType, id);

    const response: DataViewGetOut = {
      item: savedObjectToDataViewSpec(savedObject),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    const { value, error: resultValidationError } = transforms.get.out.result.down<
      DataViewGetOut,
      DataViewGetOut
    >(response);

    if (resultValidationError) {
      throw Boom.badRequest(`Invalid payload. ${resultValidationError.message}`);
    }

    return value;
  }

  async bulkGet(ctx: StorageContext, ids: string[], options: unknown): Promise<any> {
    // Not implemented. Data views does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See DataViewStorage class.`);
  }

  async create(ctx: StorageContext, data: DataViewCreateIn['data'], options: CreateOptions) {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      DataViewSpec,
      DataViewSpec
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid payload. ${dataError.message}`);
    }

    const soClient = await savedObjectClientFromRequest(ctx);
    const savedObject = await soClient.create(
      DataViewContentType,
      dataViewSpecToSavedObject(dataToLatest),
      options
    );

    const { value, error: resultError } = transforms.create.out.result.down<
      DataViewCreateOut,
      DataViewCreateOut
    >({
      item: savedObjectToDataViewSpec(savedObject),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  // note maps supports partial updates
  async update(
    ctx: StorageContext,
    id: string,
    data: DataViewUpdateIn['data'],
    options: DataViewUpdateOptions
  ) {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      DataViewSpec,
      DataViewSpec
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      CreateOptions,
      CreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const soClient = await savedObjectClientFromRequest(ctx);
    // todo support partial update
    const result = await soClient.update(
      DataViewContentType,
      id,
      dataViewSpecToSavedObject(dataToLatest),
      optionsToLatest
    );

    // const spec = savedObjectToDataViewSpec(result);
    // todo this is basically useless
    return { item: result };
  }

  async delete(ctx: StorageContext, id: string) {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(DataViewContentType, id);
    return { success: true };
  }

  async search(ctx: StorageContext, query: SearchQuery) {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
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
      type: DataViewContentType,
      search: query.text,
      perPage: query.limit,
      page: query.cursor ? +query.cursor : undefined,
      defaultSearchOperator: 'AND',
      searchFields: ['title'],
      fields: ['title'],
      hasReference,
      hasNoReference,
    };

    const res = await soClient.find<DataViewAttributes>(soQuery);

    const { value, error: resultError } = transforms.search.out.result.down<
      DataViewSearchOut,
      DataViewSearchOut
    >({
      hits: res.saved_objects.map((so) => savedObjectToDataViewSpec(so)),
      pagination: {
        total: res.total,
      },
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
}
