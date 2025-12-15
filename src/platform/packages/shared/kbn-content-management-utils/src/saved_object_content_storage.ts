/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import type { SearchQuery, SearchIn, FacetBucket } from '@kbn/content-management-plugin/common';
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

export type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
  references: SavedObjectReference[] | undefined;
};

export interface SearchArgsToSOFindOptionsOptionsDefault {
  fields?: string[];
  searchFields?: string[];
}

/**
 * Builds a KQL filter string for createdBy filtering.
 *
 * @param createdBy - The createdBy filter configuration from the search query.
 * @param savedObjectType - The saved object type to use in the filter path.
 * @returns A KQL filter string or `undefined` if no filter is needed.
 */
export const buildCreatedByFilter = (
  createdBy: SearchQuery['createdBy'],
  savedObjectType: string
): string | undefined => {
  if (!createdBy) return undefined;

  const conditions: string[] = [];

  // Include specific users.
  if (createdBy.included?.length) {
    const userConditions = createdBy.included.map(
      (uid) => `${savedObjectType}.created_by:"${uid}"`
    );
    if (userConditions.length === 1) {
      conditions.push(userConditions[0]);
    } else {
      conditions.push(`(${userConditions.join(' OR ')})`);
    }
  }

  // Exclude specific users.
  if (createdBy.excluded?.length) {
    const excludeConditions = createdBy.excluded.map(
      (uid) => `NOT ${savedObjectType}.created_by:"${uid}"`
    );
    conditions.push(...excludeConditions);
  }

  // Include items with no creator.
  if (createdBy.includeNoCreator) {
    conditions.push(`NOT ${savedObjectType}.created_by:*`);
  }

  if (conditions.length === 0) return undefined;
  return conditions.join(' AND ');
};

/**
 * Builds a KQL filter for favorites filtering using IDs.
 *
 * Note: The SavedObjects API doesn't have a native way to filter by a list of IDs
 * in a single find() call, so we build a KQL filter instead.
 *
 * @param favorites - The favorites filter configuration from the search query.
 * @param savedObjectType - The saved object type to use in the filter path.
 * @returns A KQL filter string or `undefined` if no filter is needed.
 */
export const buildFavoritesFilter = (
  favorites: SearchQuery['favorites'],
  savedObjectType: string
): string | undefined => {
  if (!favorites?.only) return undefined;

  if (!favorites.ids?.length) {
    // If favorites.only is true but no IDs provided, return a filter that matches nothing.
    // We use a negative match for all IDs which effectively returns an empty result.
    return `${savedObjectType}.id:""`;
  }

  // Build an OR filter for all favorite IDs.
  const idConditions = favorites.ids.map((id) => `${savedObjectType}.id:"${id}"`);
  if (idConditions.length === 1) {
    return idConditions[0];
  }
  return `(${idConditions.join(' OR ')})`;
};

/**
 * Combines multiple KQL filter strings with AND logic.
 *
 * @param filters - Array of filter strings (undefined values are ignored).
 * @returns Combined filter string or `undefined` if no filters.
 */
const combineFilters = (...filters: Array<string | undefined>): string | undefined => {
  const validFilters = filters.filter((f): f is string => !!f);
  if (validFilters.length === 0) return undefined;
  if (validFilters.length === 1) return validFilters[0];
  return validFilters.map((f) => `(${f})`).join(' AND ');
};

/** Default size for facet aggregations. */
const DEFAULT_FACET_SIZE = 100;

/**
 * Builds aggregations for facet requests.
 *
 * @param facets - The facets configuration from the search query.
 * @param savedObjectType - The saved object type for field path prefixing.
 * @returns Aggregations object for SavedObjects find, or `undefined` if no facets requested.
 */
export const buildFacetAggregations = (
  facets: SearchQuery['facets'],
  savedObjectType: string
): Record<string, estypes.AggregationsAggregationContainer> | undefined => {
  if (!facets) return undefined;

  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {};

  // Tag facets: use nested aggregation on references.
  if (facets.tags) {
    const size = facets.tags.size ?? DEFAULT_FACET_SIZE;
    aggs.tagFacet = {
      nested: { path: 'references' },
      aggs: {
        tagFilter: {
          filter: { term: { 'references.type': 'tag' } },
          aggs: {
            tagIds: {
              terms: {
                field: 'references.id',
                size,
              },
            },
          },
        },
      },
    };
  }

  // CreatedBy facets: use terms aggregation on created_by field.
  if (facets.createdBy) {
    const size = facets.createdBy.size ?? DEFAULT_FACET_SIZE;
    aggs.createdByFacet = {
      terms: {
        field: `${savedObjectType}.created_by`,
        size,
        ...(facets.createdBy.includeMissing && { missing: '__missing__' }),
      },
    };
  }

  return Object.keys(aggs).length > 0 ? aggs : undefined;
};

/**
 * Parses facet aggregation results from the SavedObjects response.
 *
 * @param aggregations - The aggregations object from the SavedObjects find response.
 * @returns Parsed facet results, or `undefined` if no aggregations.
 */
export const parseFacetAggregations = (
  aggregations: unknown
): { tags?: FacetBucket[]; createdBy?: FacetBucket[] } | undefined => {
  if (!aggregations || typeof aggregations !== 'object') return undefined;

  const aggs = aggregations as Record<string, unknown>;
  const result: { tags?: FacetBucket[]; createdBy?: FacetBucket[] } = {};

  // Parse tag facets from nested aggregation.
  if (aggs.tagFacet) {
    const tagFacet = aggs.tagFacet as {
      tagFilter?: { tagIds?: { buckets?: Array<{ key: string; doc_count: number }> } };
    };
    const buckets = tagFacet.tagFilter?.tagIds?.buckets;
    if (buckets && Array.isArray(buckets)) {
      result.tags = buckets.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
      }));
    }
  }

  // Parse createdBy facets from terms aggregation.
  if (aggs.createdByFacet) {
    const createdByFacet = aggs.createdByFacet as {
      buckets?: Array<{ key: string; doc_count: number }>;
    };
    const buckets = createdByFacet.buckets;
    if (buckets && Array.isArray(buckets)) {
      result.createdBy = buckets.map((bucket) => ({
        key: bucket.key,
        doc_count: bucket.doc_count,
      }));
    }
  }

  return result.tags || result.createdBy ? result : undefined;
};

export const searchArgsToSOFindOptionsDefault = <T extends string>(
  params: SearchIn<T, SearchArgsToSOFindOptionsOptionsDefault>
): SavedObjectsFindOptions => {
  const { query, contentTypeId, options } = params;

  // Build optional KQL filters.
  const createdByKqlFilter = buildCreatedByFilter(query.createdBy, contentTypeId);
  const favoritesKqlFilter = buildFavoritesFilter(query.favorites, contentTypeId);
  const combinedFilter = combineFilters(createdByKqlFilter, favoritesKqlFilter);

  // Build aggregations for facets.
  const aggs = buildFacetAggregations(query.facets, contentTypeId);

  return {
    type: contentTypeId,
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    searchFields: options?.searchFields ?? ['description', 'title'],
    fields: options?.fields ?? ['description', 'title'],
    ...tagsToFindOptions(query.tags),
    // Server-side sorting support.
    ...(query.sort && {
      sortField: query.sort.field,
      sortOrder: query.sort.direction,
    }),
    // Server-side filtering support.
    ...(combinedFilter && { filter: combinedFilter }),
    // Facet aggregations.
    ...(aggs && { aggs }),
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
  allowedSavedObjectAttributes: Array<keyof Types['Attributes']>;
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

          const contentItem = this.savedObjectToItem(
            savedObject as SavedObjectsFindResult<Types['Attributes']>
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

  protected static getSOClientFromRequest = async (ctx: StorageContext) => {
    if (!ctx.requestHandlerContext) {
      throw new Error('Storage context.requestHandlerContext missing.');
    }

    const { savedObjects } = await ctx.requestHandlerContext.core;
    return savedObjects.client;
  };

  protected readonly throwOnResultValidationError: boolean;
  protected readonly logger: Logger;
  protected readonly savedObjectType: SOContentStorageConstructorParams<Types>['savedObjectType'];
  protected readonly cmServicesDefinition: SOContentStorageConstructorParams<Types>['cmServicesDefinition'];
  protected readonly createArgsToSoCreateOptions: CreateArgsToSoCreateOptions<Types>;
  protected readonly updateArgsToSoUpdateOptions: UpdateArgsToSoUpdateOptions<Types>;
  protected readonly searchArgsToSOFindOptions: SearchArgsToSOFindOptions<Types>;
  protected readonly allowedSavedObjectAttributes: Array<keyof Types['Attributes']>;

  protected savedObjectToItem(savedObject: SavedObject<Types['Attributes']>): Types['Item'];
  protected savedObjectToItem(
    savedObject: PartialSavedObject<Types['Attributes']>,
    partial: true
  ): Types['PartialItem'];
  protected savedObjectToItem(
    savedObject: SavedObject<Types['Attributes']> | PartialSavedObject<Types['Attributes']>
  ): SOWithMetadata | SOWithMetadataPartial {
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
      managed,
      updatedBy,
      updatedAt,
      createdAt,
      createdBy,
      attributes: pick(attributes, this.allowedSavedObjectAttributes),
      references,
      error,
      namespaces,
      version,
    };
  }

  mSearch?: {
    savedObjectType: string;
    toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult) => Types['Item'];
    additionalSearchFields?: string[];
  };

  async get(ctx: StorageContext, id: string): Promise<Types['GetOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<Types['Attributes']>(this.savedObjectType, id);

    const response: Types['GetOut'] = {
      item: this.savedObjectToItem(savedObject),
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
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);

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
      item: this.savedObjectToItem(savedObject),
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
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      Types['Attributes'],
      Types['Attributes']
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      Types['UpdateOptions'],
      Types['UpdateOptions']
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
      item: this.savedObjectToItem(partialSavedObject, true),
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
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);
    await soClient.delete(this.savedObjectType, id, { force: options?.force ?? false });
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: Types['SearchOptions'] = {}
  ): Promise<Types['SearchOut']> {
    const transforms = ctx.utils.getTransforms(this.cmServicesDefinition);
    const soClient = await SOContentStorage.getSOClientFromRequest(ctx);

    // Validate and UP transform the options.
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
    // Execute the query in the DB.
    const soResponse = await soClient.find<Types['Attributes']>(soQuery);

    // Parse facet aggregations if present.
    const facets = parseFacetAggregations(soResponse.aggregations);

    const response: {
      hits: Types['Item'][];
      pagination: { total: number };
      facets?: { tags?: FacetBucket[]; createdBy?: FacetBucket[] };
    } = {
      hits: soResponse.saved_objects.map((so) => this.savedObjectToItem(so)),
      pagination: {
        total: soResponse.total,
      },
      ...(facets && { facets }),
    };

    const validationError = transforms.search.out.result.validate(response);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate the response and DOWN transform to the request version.
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
