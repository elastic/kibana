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

import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type {
  EventAnnotationGroupSavedObjectAttributes,
  EventAnnotationGroupSavedObject,
  PartialEventAnnotationGroupSavedObject,
  EventAnnotationGroupGetOut,
  EventAnnotationGroupCreateIn,
  EventAnnotationGroupCreateOut,
  CreateOptions,
  EventAnnotationGroupUpdateIn,
  EventAnnotationGroupUpdateOut,
  UpdateOptions,
  EventAnnotationGroupDeleteOut,
  EventAnnotationGroupSearchQuery,
  EventAnnotationGroupSearchOut,
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

function savedObjectToEventAnnotationGroupSavedObject(
  savedObject: SavedObject<EventAnnotationGroupSavedObjectAttributes>,
  partial: false
): EventAnnotationGroupSavedObject;

function savedObjectToEventAnnotationGroupSavedObject(
  savedObject: PartialSavedObject<EventAnnotationGroupSavedObjectAttributes>,
  partial: true
): PartialEventAnnotationGroupSavedObject;

function savedObjectToEventAnnotationGroupSavedObject(
  savedObject:
    | SavedObject<EventAnnotationGroupSavedObjectAttributes>
    | PartialSavedObject<EventAnnotationGroupSavedObjectAttributes>
): EventAnnotationGroupSavedObject | PartialEventAnnotationGroupSavedObject {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes: { title, description, annotations, ignoreGlobalFilters, dataViewSpec },
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
      annotations,
      ignoreGlobalFilters,
      dataViewSpec,
    },
    references,
    error,
    namespaces,
  };
}

const SO_TYPE = EVENT_ANNOTATION_GROUP_TYPE;

export class EventAnnotationGroupStorage
  implements
    ContentStorage<EventAnnotationGroupSavedObject, PartialEventAnnotationGroupSavedObject>
{
  mSearch: GetMSearchType<EventAnnotationGroupSavedObject>;
  constructor() {
    this.mSearch = getMSearch<EventAnnotationGroupSavedObject, EventAnnotationGroupSearchOut>({
      savedObjectType: SO_TYPE,
      cmServicesDefinition,
      allowedSavedObjectAttributes: [
        'title',
        'description',
        'ignoreGlobalFilters',
        'annotations',
        'dataViewSpec',
      ],
    });
  }

  async get(ctx: StorageContext, id: string): Promise<EventAnnotationGroupGetOut> {
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
    } = await soClient.resolve<EventAnnotationGroupSavedObjectAttributes>(SO_TYPE, id);

    const response: EventAnnotationGroupGetOut = {
      item: savedObjectToEventAnnotationGroupSavedObject(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<
      EventAnnotationGroupGetOut,
      EventAnnotationGroupGetOut
    >(response);

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented. EventAnnotationGroup does not use bulkGet
    throw new Error(`[bulkGet] has not been implemented. See EventAnnotationGroupStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: EventAnnotationGroupCreateIn['data'],
    options: CreateOptions
  ): Promise<EventAnnotationGroupCreateOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      EventAnnotationGroupSavedObjectAttributes,
      EventAnnotationGroupSavedObjectAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      CreateOptions,
      CreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const savedObject = await soClient.create<EventAnnotationGroupSavedObjectAttributes>(
      SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      EventAnnotationGroupCreateOut,
      EventAnnotationGroupCreateOut
    >({
      item: savedObjectToEventAnnotationGroupSavedObject(savedObject, false),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(
    ctx: StorageContext,
    id: string,
    data: EventAnnotationGroupUpdateIn['data'],
    options: UpdateOptions
  ): Promise<EventAnnotationGroupUpdateOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      EventAnnotationGroupSavedObjectAttributes,
      EventAnnotationGroupSavedObjectAttributes
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

    // Save data in DB
    const soClient = await savedObjectClientFromRequest(ctx);
    const partialSavedObject = await soClient.update<EventAnnotationGroupSavedObjectAttributes>(
      SO_TYPE,
      id,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      EventAnnotationGroupUpdateOut,
      EventAnnotationGroupUpdateOut
    >({
      item: savedObjectToEventAnnotationGroupSavedObject(partialSavedObject, true),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string): Promise<EventAnnotationGroupDeleteOut> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(SO_TYPE, id);
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: EventAnnotationGroupSearchQuery = {}
  ): Promise<EventAnnotationGroupSearchOut> {
    const {
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const transforms = getTransforms(cmServicesDefinition, requestVersion);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      EventAnnotationGroupSearchQuery,
      EventAnnotationGroupSearchQuery
    >(options);

    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const { searchFields = ['title^3', 'description'], types = [SO_TYPE] } = optionsToLatest;

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
      page: query.cursor ? Number(query.cursor) : undefined,
      defaultSearchOperator: 'AND',
      searchFields,
      hasReference,
      hasNoReference,
    };

    // Execute the query in the DB
    const response = await soClient.find<EventAnnotationGroupSavedObjectAttributes>(soQuery);

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      EventAnnotationGroupSearchOut,
      EventAnnotationGroupSearchOut
    >({
      hits: response.saved_objects.map((so) =>
        savedObjectToEventAnnotationGroupSavedObject(so, false)
      ),
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
