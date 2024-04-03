/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import type { SearchQuery, SearchIn } from '@kbn/content-management-plugin/common';
import type {
  ContentStorage,
  StorageContext,
  MSearchConfig,
} from '@kbn/content-management-plugin/server';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindOptions,
  SavedObjectsCreateOptions,
  SavedObjectsUpdateOptions,
  SavedObjectsFindResult,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import { pick } from 'lodash';
import type {
  CMCrudTypes,
  ServicesDefinitionSet,
  SOWithMetadata,
  SOWithMetadataPartial,
} from './types';
import { tagsToFindOptions } from './utils';

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

function savedObjectToItem<Attributes extends object, Item extends SOWithMetadata>(
  savedObject: SavedObject<Attributes>,
  allowedSavedObjectAttributes: string[],
  partial: false
): Item;

function savedObjectToItem<Attributes extends object, PartialItem extends SOWithMetadata>(
  savedObject: PartialSavedObject<Attributes>,
  allowedSavedObjectAttributes: string[],
  partial: true
): PartialItem;

function savedObjectToItem<Attributes extends object>(
  savedObject: SavedObject<Attributes> | PartialSavedObject<Attributes>,
  allowedSavedObjectAttributes: string[]
): SOWithMetadata | SOWithMetadataPartial {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
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
    managed,
    updatedAt,
    createdAt,
    attributes: pick(attributes, allowedSavedObjectAttributes),
    references,
    error,
    namespaces,
    version,
  };
}

export interface SearchArgsToSOFindOptionsOptionsDefault {
  fields?: string[];
  searchFields?: string[];
}

export const searchArgsToSOFindOptionsDefault = <T extends string>(
  params: SearchIn<T, SearchArgsToSOFindOptionsOptionsDefault>
): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = params;

  return {
    type: contentTypeId,
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    searchFields: options?.searchFields ?? ['description', 'title'],
    fields: options?.fields ?? ['description', 'title'],
    ...tagsToFindOptions(query.tags),
  };
};

export const createArgsToSoCreateOptionsDefault = (
  params: SavedObjectsCreateOptions
): SavedObjectsCreateOptions => params;

export const updateArgsToSoUpdateOptionsDefault = <Types extends CMCrudTypes>(
  params: SavedObjectsUpdateOptions<Types['Attributes']>
): SavedObjectsUpdateOptions<Types['Attributes']> => params;

export type CreateArgsToSoCreateOptions<Types extends CMCrudTypes> = (
  params: Types['CreateOptions']
) => SavedObjectsCreateOptions;

export type SearchArgsToSOFindOptions<Types extends CMCrudTypes> = (
  params: Types['SearchIn']
) => SavedObjectsFindOptions;

export type UpdateArgsToSoUpdateOptions<Types extends CMCrudTypes> = (
  params: Types['UpdateOptions']
) => SavedObjectsUpdateOptions<Types['Attributes']>;

export interface SOContentStorageConstructorParams<Types extends CMCrudTypes> {
  savedObjectType: string;
  cmServicesDefinition: ServicesDefinitionSet;
  // this is necessary since unexpected saved object attributes could cause schema validation to fail
  allowedSavedObjectAttributes: string[];
  createArgsToSoCreateOptions?: CreateArgsToSoCreateOptions<Types>;
  updateArgsToSoUpdateOptions?: UpdateArgsToSoUpdateOptions<Types>;
  searchArgsToSOFindOptions?: SearchArgsToSOFindOptions<Types>;
  /**
   * MSearch is a feature that allows searching across multiple content types
   * (for example, could be used in a general content finder or the like)
   *
   * defaults to false
   */
  enableMSearch?: boolean;
  mSearchAdditionalSearchFields?: string[];

  logger: Logger;
  throwOnResultValidationError: boolean;
}

export abstract class SOContentStorage<Types extends CMCrudTypes>
  implements
    ContentStorage<
      Types['Item'],
      Types['PartialItem'],
      MSearchConfig<Types['Item'], Types['Attributes']>
    >
{
  constructor({
    savedObjectType,
    cmServicesDefinition,
    createArgsToSoCreateOptions,
    updateArgsToSoUpdateOptions,
    searchArgsToSOFindOptions,
    enableMSearch,
    allowedSavedObjectAttributes,
    mSearchAdditionalSearchFields,
    logger,
    throwOnResultValidationError,
  }: SOContentStorageConstructorParams<Types>) {
    this.logger = logger;
    this.throwOnResultValidationError = throwOnResultValidationError ?? false;
    this.savedObjectType = savedObjectType;
    this.cmServicesDefinition = cmServicesDefinition;
    this.createArgsToSoCreateOptions =
      createArgsToSoCreateOptions || createArgsToSoCreateOptionsDefault;
    this.updateArgsToSoUpdateOptions =
      updateArgsToSoUpdateOptions || updateArgsToSoUpdateOptionsDefault;
    this.searchArgsToSOFindOptions = searchArgsToSOFindOptions || searchArgsToSOFindOptionsDefault;
    this.allowedSavedObjectAttributes = allowedSavedObjectAttributes;

    if (enableMSearch) {
      this.mSearch = {
        savedObjectType: this.savedObjectType,
        additionalSearchFields: mSearchAdditionalSearchFields,
        toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult): Types['Item'] => {
          const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);

          const contentItem = savedObjectToItem(
            savedObject as SavedObjectsFindResult<Types['Attributes']>,
            this.allowedSavedObjectAttributes,
            false
          );

          const validationError = transforms.mSearch.out.result.validate(contentItem);
          if (validationError) {
            if (this.throwOnResultValidationError) {
              throw Boom.badRequest(`Invalid response. ${validationError.message}`);
            } else {
              this.logger.warn(`Invalid response. ${validationError.message}`);
            }
          }

          // Validate DB response and DOWN transform to the request version
          const { value, error: resultError } = transforms.mSearch.out.result.down<
            Types['Item'],
            Types['Item']
          >(
            contentItem,
            undefined, // do not override version
            { validate: false } // validation is done above
          );

          if (resultError) {
            throw Boom.badRequest(`Invalid response. ${resultError.message}`);
          }

          return value;
        },
      };
    }
  }

  private throwOnResultValidationError: boolean;
  private logger: Logger;
  private savedObjectType: SOContentStorageConstructorParams<Types>['savedObjectType'];
  private cmServicesDefinition: SOContentStorageConstructorParams<Types>['cmServicesDefinition'];
  private createArgsToSoCreateOptions: CreateArgsToSoCreateOptions<Types>;
  private updateArgsToSoUpdateOptions: UpdateArgsToSoUpdateOptions<Types>;
  private searchArgsToSOFindOptions: SearchArgsToSOFindOptions<Types>;
  private allowedSavedObjectAttributes: string[];

  mSearch?: {
    savedObjectType: string;
    toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult) => Types['Item'];
    additionalSearchFields?: string[];
  };

  async get(ctx: StorageContext, id: string): Promise<Types['GetOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<Types['Attributes']>(this.savedObjectType, id);

    const response: Types['GetOut'] = {
      item: savedObjectToItem(savedObject, this.allowedSavedObjectAttributes, false),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    const validationError = transforms.get.out.result.validate(response);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<
      Types['GetOut'],
      Types['GetOut']
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

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See ${this.constructor.name} class.`);
  }

  async create(
    ctx: StorageContext,
    data: Types['Attributes'],
    options: Types['CreateOptions']
  ): Promise<Types['CreateOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

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

    const createOptions = this.createArgsToSoCreateOptions(optionsToLatest);

    // Save data in DB
    const savedObject = await soClient.create<Types['Attributes']>(
      this.savedObjectType,
      dataToLatest,
      createOptions
    );

    const result = {
      item: savedObjectToItem(savedObject, this.allowedSavedObjectAttributes, false),
    };

    const validationError = transforms.create.out.result.validate(result);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      Types['CreateOut'],
      Types['CreateOut']
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
    data: Types['Attributes'],
    options: Types['UpdateOptions']
  ): Promise<Types['UpdateOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

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

    const updateOptions = this.updateArgsToSoUpdateOptions(optionsToLatest);

    // Save data in DB
    const partialSavedObject = await soClient.update<Types['Attributes']>(
      this.savedObjectType,
      id,
      dataToLatest,
      updateOptions
    );

    const result = {
      item: savedObjectToItem(partialSavedObject, this.allowedSavedObjectAttributes, true),
    };

    const validationError = transforms.update.out.result.validate(result);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      Types['UpdateOut'],
      Types['UpdateOut']
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

  async delete(
    ctx: StorageContext,
    id: string,
    // force is necessary to delete saved objects that exist in multiple namespaces
    options?: { force: boolean }
  ): Promise<Types['DeleteOut']> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(this.savedObjectType, id, { force: options?.force ?? false });
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: Types['SearchOptions'] = {}
  ): Promise<Types['SearchOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      Types['SearchOptions'],
      Types['SearchOptions']
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const soQuery: SavedObjectsFindOptions = this.searchArgsToSOFindOptions({
      contentTypeId: this.savedObjectType,
      query,
      options: optionsToLatest,
    });
    // Execute the query in the DB
    const soResponse = await soClient.find<Types['Attributes']>(soQuery);
    const response = {
      hits: soResponse.saved_objects.map((so) =>
        savedObjectToItem(so, this.allowedSavedObjectAttributes, false)
      ),
      pagination: {
        total: soResponse.total,
      },
    };

    const validationError = transforms.search.out.result.validate(response);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down<
      Types['SearchOut'],
      Types['SearchOut']
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
