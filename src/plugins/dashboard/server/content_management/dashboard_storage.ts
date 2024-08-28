/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import { tagsToFindOptions } from '@kbn/content-management-utils';
import {
  SavedObject,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateOptions,
} from '@kbn/core-saved-objects-api-server';

import {
  ContentStorage,
  MSearchConfig,
  StorageContext,
} from '@kbn/content-management-plugin/server';
import { SearchQuery } from '@kbn/content-management-plugin/common';
import {
  PersistableControlGroupInput,
  RawControlGroupAttributes,
} from '@kbn/controls-plugin/common';

import {
  CONTENT_ID,
  DashboardAttributes,
  RawDashboardAttributes,
} from '../../common/content_management';
import { cmServicesDefinition } from '../../common/content_management/cm_services';
import type { DashboardCrudTypes } from '../../common/content_management';

function searchArgsToSOFindOptions(args: DashboardCrudTypes['SearchIn']): SavedObjectsFindOptions {
  const { query, contentTypeId, options } = args;

  return {
    type: contentTypeId,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    fields: ['description', 'title', 'timeRestore'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    ...tagsToFindOptions(query.tags),
  };
}

function createArgsToSoCreateOptions(params: SavedObjectsCreateOptions): SavedObjectsCreateOptions {
  return params;
}

function updateArgsToSoUpdateOptions(
  params: SavedObjectsUpdateOptions<RawDashboardAttributes>
): SavedObjectsUpdateOptions<RawDashboardAttributes> {
  return params;
}

function controlGroupInputIn(
  controlGroupInput?: PersistableControlGroupInput
): RawControlGroupAttributes | undefined {
  if (!controlGroupInput) {
    return;
  }
  const { panels, ignoreParentSettings, ...rest } = controlGroupInput;
  return {
    ...rest,
    panelsJSON: JSON.stringify(panels),
    ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings ?? {}),
  };
}

function kibanaSavedObjectMetaIn(
  kibanaSavedObjectMeta: DashboardAttributes['kibanaSavedObjectMeta']
): RawDashboardAttributes['kibanaSavedObjectMeta'] {
  const { searchSource, ...rest } = kibanaSavedObjectMeta;
  return {
    ...rest,
    searchSourceJSON: JSON.stringify(searchSource ?? {}),
  };
}

function dashboardAttributesIn(attributes: DashboardAttributes): RawDashboardAttributes {
  const { controlGroupInput, panels, options, kibanaSavedObjectMeta, ...rest } = attributes;

  return {
    ...rest,
    ...(controlGroupInput && { controlGroupInput: controlGroupInputIn(controlGroupInput) }),
    ...(options && { optionsJSON: JSON.stringify(options) }),
    panelsJSON: JSON.stringify(panels),
    kibanaSavedObjectMeta: kibanaSavedObjectMetaIn(kibanaSavedObjectMeta),
  };
}

function controlGroupInputOut(
  controlGroupInput?: RawControlGroupAttributes
): PersistableControlGroupInput | undefined {
  if (!controlGroupInput) {
    return;
  }
  const { panelsJSON, ignoreParentSettingsJSON, ...rest } = controlGroupInput;
  return {
    ...rest,
    panels: JSON.parse(panelsJSON),
    ignoreParentSettings: JSON.parse(ignoreParentSettingsJSON),
  };
}

function kibanaSavedObjectMetaOut(
  kibanaSavedObjectMeta: RawDashboardAttributes['kibanaSavedObjectMeta']
): DashboardAttributes['kibanaSavedObjectMeta'] {
  const { searchSourceJSON, ...rest } = kibanaSavedObjectMeta;
  return {
    ...rest,
    searchSource: JSON.parse(searchSourceJSON),
  };
}

function dashboardAttributesOut(
  attributes: RawDashboardAttributes | Partial<RawDashboardAttributes>
): DashboardAttributes | Partial<DashboardAttributes> {
  const { controlGroupInput, panelsJSON, optionsJSON, kibanaSavedObjectMeta, ...rest } = attributes;

  return {
    ...rest,
    ...(controlGroupInput && { controlGroupInput: controlGroupInputOut(controlGroupInput) }),
    ...(optionsJSON && { options: JSON.parse(optionsJSON) ?? {} }),
    ...(panelsJSON && { panels: JSON.parse(panelsJSON) ?? {} }),
    ...(kibanaSavedObjectMeta && {
      kibanaSavedObjectMeta: kibanaSavedObjectMetaOut(kibanaSavedObjectMeta),
    }),
    ...(controlGroupInput && { controlGroupInput: controlGroupInputOut(controlGroupInput) }),
  };
}

function savedObjectToDashboardItem(
  savedObject: SavedObject<RawDashboardAttributes>,
  partial: false
): DashboardCrudTypes['Item'];

function savedObjectToDashboardItem(
  savedObject: SavedObject<RawDashboardAttributes>,
  partial: true
): DashboardCrudTypes['PartialItem'];

function savedObjectToDashboardItem(
  savedObject: SavedObject<RawDashboardAttributes>
): DashboardCrudTypes['Item'] | DashboardCrudTypes['PartialItem'] {
  const {
    id,
    type,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    attributes,
    references,
    error,
    namespaces,
    version,
    managed,
  } = savedObject;

  return {
    id,
    type,
    updatedAt,
    updatedBy,
    createdAt,
    createdBy,
    attributes: dashboardAttributesOut(attributes),
    references,
    error,
    namespaces,
    version,
    managed,
  };
}

export class DashboardStorage
  implements
    ContentStorage<
      DashboardCrudTypes['Item'],
      DashboardCrudTypes['PartialItem'],
      MSearchConfig<DashboardCrudTypes['Item'], RawDashboardAttributes>
    >
{
  mSearch = {
    savedObjectType: CONTENT_ID,
    toItemResult: (ctx: StorageContext, savedObject: SavedObject<RawDashboardAttributes>) => {
      const transforms = ctx.utils.getTransforms(cmServicesDefinition);
      const item = savedObjectToDashboardItem(savedObject, false);

      const validationError = transforms.mSearch.out.result.validate(item);
      if (validationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      }

      // Validate the response and DOWN transform to the request version
      const { value, error: resultError } = transforms.mSearch.out.result.down(
        item,
        undefined, // do not override version
        { validate: false } // validation is done above
      );

      if (resultError) {
        throw Boom.badRequest(`Invalid response. ${resultError.message}`);
      }

      return value;
    },
  };

  async get(ctx: StorageContext, id: string): Promise<DashboardCrudTypes['GetOut']> {
    const {
      savedObjects: { client: soClient },
    } = await ctx.requestHandlerContext.core;
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);

    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<RawDashboardAttributes>(CONTENT_ID, id);

    const response: DashboardCrudTypes['GetOut'] = {
      item: savedObjectToDashboardItem(savedObject, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    const { value, error: resultValidationError } = transforms.get.out.result.down<
      DashboardCrudTypes['GetOut'],
      DashboardCrudTypes['GetOut']
    >(response);

    if (resultValidationError) {
      throw Boom.badRequest(`Invalid response. ${resultValidationError.message}`);
    }

    return value;
  }
  async create(
    ctx: StorageContext,
    data: DashboardAttributes,
    options: DashboardCrudTypes['CreateOptions']
  ): Promise<DashboardCrudTypes['CreateOut']> {
    const {
      savedObjects: { client: soClient },
    } = await ctx.requestHandlerContext.core;
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      DashboardAttributes,
      DashboardAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      DashboardCrudTypes['CreateOptions'],
      DashboardCrudTypes['CreateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const createOptions = createArgsToSoCreateOptions(optionsToLatest);

    // Save data in DB
    const savedObject = await soClient.create<RawDashboardAttributes>(
      CONTENT_ID,
      dashboardAttributesIn(dataToLatest),
      createOptions
    );

    const result = {
      item: savedObjectToDashboardItem(savedObject, false),
    };

    const validationError = transforms.create.out.result.validate(result);
    if (validationError) {
      throw Boom.badRequest(`Invalid response. ${validationError.message}`);
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      DashboardCrudTypes['CreateOut'],
      DashboardCrudTypes['CreateOut']
    >(
      result,
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
  async update(
    ctx: StorageContext,
    id: string,
    data: DashboardCrudTypes['UpdateIn'],
    options: DashboardCrudTypes['UpdateOptions']
  ): Promise<DashboardCrudTypes['UpdateOut']> {
    const {
      savedObjects: { client: soClient },
    } = await ctx.requestHandlerContext.core;
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      DashboardCrudTypes['Attributes'],
      DashboardCrudTypes['Attributes']
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      DashboardCrudTypes['UpdateOptions'],
      DashboardCrudTypes['UpdateOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const updateOptions = updateArgsToSoUpdateOptions(optionsToLatest);

    // Save data in DB
    const partialSavedObject = await soClient.update<RawDashboardAttributes>(
      CONTENT_ID,
      id,
      dashboardAttributesIn(dataToLatest),
      updateOptions
    );

    const result = {
      item: savedObjectToDashboardItem(partialSavedObject, true),
    };

    const validationError = transforms.update.out.result.validate(result);
    if (validationError) {
      throw Boom.badRequest(`Invalid response. ${validationError.message}`);
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      DashboardCrudTypes['UpdateOut'],
      DashboardCrudTypes['UpdateOut']
    >(
      result,
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
  async delete(ctx: StorageContext, id: string): Promise<DashboardCrudTypes['DeleteOut']> {
    const {
      savedObjects: { client: soClient },
    } = await ctx.requestHandlerContext.core;

    await soClient.delete(CONTENT_ID, id);
    return { success: true };
  }

  async bulkGet(ctx: StorageContext, ids: string[]): Promise<never> {
    throw new Error('Method not implemented.');
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: DashboardCrudTypes['SearchOptions'] = {}
  ): Promise<DashboardCrudTypes['SearchOut']> {
    const {
      savedObjects: { client: soClient },
    } = await ctx.requestHandlerContext.core;
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      DashboardCrudTypes['SearchOptions'],
      DashboardCrudTypes['SearchOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const soQuery: SavedObjectsFindOptions = searchArgsToSOFindOptions({
      contentTypeId: CONTENT_ID,
      query,
      options: optionsToLatest,
    });

    const soResponse = await soClient.find<RawDashboardAttributes>(soQuery);
    const response = {
      hits: soResponse.saved_objects.map((so) => savedObjectToDashboardItem(so, false)),
      pagination: {
        total: soResponse.total,
      },
    };

    const validationError = transforms.search.out.result.validate(response);
    if (validationError) {
      throw Boom.badRequest(`Invalid response. ${validationError.message}`);
    }

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      DashboardCrudTypes['SearchOut'],
      DashboardCrudTypes['SearchOut']
    >(
      response,
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }
}
