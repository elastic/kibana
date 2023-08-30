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

import { getMSearch, type GetMSearchType } from '@kbn/content-management-utils';

import { CONTENT_ID } from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type {
  VisualizationSavedObjectAttributes,
  VisualizationContentType,
  VisualizationCrudTypes,
} from '../../common/content_management';

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

function savedObjectToVisualizationSavedObject(
  savedObject: SavedObject<VisualizationSavedObjectAttributes>,
  partial: false
): VisualizationCrudTypes['Item'];

function savedObjectToVisualizationSavedObject(
  savedObject: PartialSavedObject<VisualizationSavedObjectAttributes>,
  partial: true
): VisualizationCrudTypes['PartialItem'];

function savedObjectToVisualizationSavedObject(
  savedObject:
    | SavedObject<VisualizationSavedObjectAttributes>
    | PartialSavedObject<VisualizationSavedObjectAttributes>
): VisualizationCrudTypes['Item'] | VisualizationCrudTypes['PartialItem'] {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes: {
      title,
      description,
      visState,
      kibanaSavedObjectMeta,
      uiStateJSON,
      savedSearchRefName,
    },
    references,
    error,
    namespaces,
  } = savedObject;

  return {
    id,
    type,
    updatedAt,
    createdAt,
    attributes: {
      title,
      description,
      visState,
      kibanaSavedObjectMeta,
      uiStateJSON,
      savedSearchRefName,
    },
    references,
    error,
    namespaces,
  };
}

const SO_TYPE: VisualizationContentType = 'visualization';

export class VisualizationsStorage
  implements ContentStorage<VisualizationCrudTypes['Item'], VisualizationCrudTypes['PartialItem']>
{
  mSearch: GetMSearchType<VisualizationCrudTypes['Item']>;

  constructor() {
    this.mSearch = getMSearch<VisualizationCrudTypes['Item'], VisualizationCrudTypes['SearchOut']>({
      savedObjectType: SO_TYPE,
      cmServicesDefinition,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'version',
        'kibanaSavedObjectMeta',
        'uiStateJSON',
        'visState',
        'savedSearchRefName',
      ],
    });
  }

  async get(ctx: StorageContext, id: string): Promise<VisualizationCrudTypes['GetOut']> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<VisualizationSavedObjectAttributes>(SO_TYPE, id);

    const response: VisualizationCrudTypes['GetOut'] = {
      item: savedObjectToVisualizationSavedObject(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<
      VisualizationCrudTypes['GetOut'],
      VisualizationCrudTypes['GetOut']
    >(response);

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented. Visualizations does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See VisualizationsStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: VisualizationCrudTypes['CreateIn']['data'],
    options: VisualizationCrudTypes['CreateOptions']
  ): Promise<VisualizationCrudTypes['CreateOut']> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      VisualizationSavedObjectAttributes,
      VisualizationSavedObjectAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      VisualizationCrudTypes['CreateOptions'],
      VisualizationCrudTypes['CreateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const savedObject = await soClient.create<VisualizationSavedObjectAttributes>(
      SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      VisualizationCrudTypes['CreateOut'],
      VisualizationCrudTypes['CreateOut']
    >({
      item: savedObjectToVisualizationSavedObject(savedObject, false),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: VisualizationCrudTypes['UpdateIn']['data'],
    options: VisualizationCrudTypes['UpdateOptions']
  ): Promise<VisualizationCrudTypes['UpdateOut']> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      Partial<VisualizationSavedObjectAttributes>,
      Partial<VisualizationSavedObjectAttributes>
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      VisualizationCrudTypes['CreateOptions'],
      VisualizationCrudTypes['CreateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const partialSavedObject = await soClient.update<VisualizationSavedObjectAttributes>(
      SO_TYPE,
      id,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      VisualizationCrudTypes['UpdateOut'],
      VisualizationCrudTypes['UpdateOut']
    >({
      item: savedObjectToVisualizationSavedObject(partialSavedObject, true),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string): Promise<VisualizationCrudTypes['DeleteOut']> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(SO_TYPE, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: VisualizationCrudTypes['SearchOptions'] = {}
  ): Promise<VisualizationCrudTypes['SearchOut']> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      VisualizationCrudTypes['SearchOptions'],
      VisualizationCrudTypes['SearchOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }
    const { searchFields = ['title^3', 'description'], types = [CONTENT_ID] } = optionsToLatest;

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
      type: types,
      search: query.text,
      perPage: query.limit,
      page: query.cursor ? +query.cursor : undefined,
      defaultSearchOperator: 'AND',
      searchFields,
      hasReference,
      hasNoReference,
    };

    // Execute the query in the DB
    const response = await soClient.find<VisualizationSavedObjectAttributes>(soQuery);

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      VisualizationCrudTypes['SearchOut'],
      VisualizationCrudTypes['SearchOut']
    >({
      hits: response.saved_objects.map((so) => savedObjectToVisualizationSavedObject(so, false)),
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
