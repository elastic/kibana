/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindOptions,
} from '@kbn/core-saved-objects-api-server';
import type { CMCrudTypes, ServicesDefinitionSet } from './types';

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

function savedObjectToMapItem(savedObject: SavedObject<MapAttributes>, partial: false): MapItem;

function savedObjectToMapItem(
  savedObject: PartialSavedObject<MapAttributes>,
  partial: true
): PartialMapItem;

function savedObjectToMapItem<Attributes extends object>(
  savedObject: SavedObject<Attributes> | PartialSavedObject<Attributes>
): MapItem | PartialMapItem {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes,
    references,
    error,
    namespaces,
  } = savedObject;

  return {
    id,
    type,
    updatedAt,
    createdAt,
    attributes,
    references,
    error,
    namespaces,
  };
}

export class SOContentStorage<Types extends CMCrudTypes>
  implements ContentStorage<Types['Item'], Types['PartialItem']>
{
  constructor(private cmServicesDefinition: ServicesDefinitionSet, private SO_TYPE: string) {}

  async get(ctx: StorageContext, id: string): Promise<Types['GetOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<Types['Attributes']>(this.SO_TYPE, id);

    const response: Types['GetOut'] = {
      item: savedObjectToMapItem(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<
      Types['GetOut'],
      Types['GetOut']
    >(response);

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented. Maps does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See MapsStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: Types['Attributes'],
    // todo this is lame!
    options: Types['CreateOptions']
  ): Promise<Types['CreateOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      Types['Attributes'],
      Types['Attributes']
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      Types['CreateOptions'],
      Types['CreateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const savedObject = await soClient.create<Types['Attributes']>(
      this.SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      Types['CreateOut'],
      Types['CreateOut']
    >({
      item: savedObjectToMapItem(savedObject, false),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: Types['Attributes'],
    options: Types['UpdateOptions']
  ): Promise<Types['UpdateOut']> {
    const {
      utils: { getTransforms },
    } = ctx;
    const transforms = getTransforms(this.cmServicesDefinition);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      Types['Attributes'],
      Types['Attributes']
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      Types['CreateOptions'],
      Types['CreateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const partialSavedObject = await soClient.update<Types['Attributes']>(
      this.SO_TYPE,
      id,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      Types['UpdateOut'],
      Types['UpdateOut']
    >({
      item: savedObjectToMapItem(partialSavedObject, true),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string): Promise<Types['DeleteOut']> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(this.SO_TYPE, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: Types['SearchOptions'] = {}
  ): Promise<Types['SearchOut']> {
    const {
      utils: { getTransforms },
    } = ctx;
    const transforms = getTransforms(this.cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      Types['SearchOptions'],
      Types['SearchOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }
    const { onlyTitle = false } = optionsToLatest;

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
      type: this.SO_TYPE,
      search: query.text,
      perPage: query.limit,
      page: query.cursor ? +query.cursor : undefined,
      defaultSearchOperator: 'AND',
      searchFields: onlyTitle ? ['title'] : ['title^3', 'description'],
      fields: ['description', 'title'],
      hasReference,
      hasNoReference,
    };

    // Execute the query in the DB
    const response = await soClient.find<Types['Attributes']>(soQuery);

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      Types['SearchOut'],
      Types['SearchOut']
    >({
      hits: response.saved_objects.map((so) => savedObjectToMapItem(so, false)),
      pagination: {
        total: response.total,
      },
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
}
