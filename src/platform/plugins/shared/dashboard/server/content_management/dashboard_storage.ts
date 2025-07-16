/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { tagsToFindOptions } from '@kbn/content-management-utils';
import { SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';

import { CreateResult, DeleteResult, SearchQuery } from '@kbn/content-management-plugin/common';
import { StorageContext } from '@kbn/content-management-plugin/server';
import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { SavedObjectReference } from '@kbn/core/server';
import type { ITagsClient, Tag } from '@kbn/saved-objects-tagging-oss-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../dashboard_saved_object';
import { cmServicesDefinition } from './cm_services';
import { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { savedObjectToItem, transformDashboardIn } from './latest';
import type {
  DashboardAttributes,
  DashboardItem,
  DashboardCreateOut,
  DashboardCreateOptions,
  DashboardGetOut,
  DashboardSearchOut,
  DashboardUpdateOptions,
  DashboardUpdateOut,
  DashboardSearchOptions,
} from './latest';

const getRandomColor = (): string => {
  return '#' + String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0');
};

const searchArgsToSOFindOptions = (
  query: SearchQuery,
  options: DashboardSearchOptions
): SavedObjectsFindOptions => {
  return {
    type: DASHBOARD_SAVED_OBJECT_TYPE,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    fields: options?.fields,
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
    namespaces: options?.spaces,
    ...tagsToFindOptions(query.tags),
  };
};

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

export class DashboardStorage {
  constructor({
    logger,
    throwOnResultValidationError,
    savedObjectsTagging,
    searchService,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
    savedObjectsTagging?: SavedObjectTaggingStart;
    searchService: ISearchStart;
  }) {
    this.savedObjectsTagging = savedObjectsTagging;
    this.searchService = searchService;
    this.logger = logger;
    this.throwOnResultValidationError = throwOnResultValidationError ?? false;
  }

  private logger: Logger;
  private savedObjectsTagging?: SavedObjectTaggingStart;
  private searchService: ISearchStart;
  private throwOnResultValidationError: boolean;

  private getTagNamesFromReferences(references: SavedObjectReference[], allTags: Tag[]) {
    return Array.from(
      new Set(
        this.savedObjectsTagging
          ? this.savedObjectsTagging
              .getTagsFromReferences(references, allTags)
              .tags.map((tag) => tag.name)
          : []
      )
    );
  }

  private getUniqueTagNames(
    references: SavedObjectReference[],
    newTagNames: string[],
    allTags: Tag[]
  ) {
    const referenceTagNames = this.getTagNamesFromReferences(references, allTags);
    return new Set([...referenceTagNames, ...newTagNames]);
  }

  private async replaceTagReferencesByName(
    references: SavedObjectReference[],
    newTagNames: string[],
    allTags: Tag[],
    tagsClient?: ITagsClient
  ) {
    const combinedTagNames = this.getUniqueTagNames(references, newTagNames, allTags);
    const newTagIds = await this.convertTagNamesToIds(combinedTagNames, allTags, tagsClient);
    return this.savedObjectsTagging?.replaceTagReferences(references, newTagIds) ?? references;
  }

  private async convertTagNamesToIds(
    tagNames: Set<string>,
    allTags: Tag[],
    tagsClient?: ITagsClient
  ): Promise<string[]> {
    const combinedTagNames = await this.createTagsIfNeeded(tagNames, allTags, tagsClient);

    return Array.from(combinedTagNames).flatMap(
      (tagName) => this.savedObjectsTagging?.convertTagNameToId(tagName, allTags) ?? []
    );
  }

  private async createTagsIfNeeded(
    tagNames: Set<string>,
    allTags: Tag[],
    tagsClient?: ITagsClient
  ) {
    const tagsToCreate = Array.from(tagNames).filter(
      (tagName) => !allTags.some((tag) => tag.name === tagName)
    );
    const tagCreationResults = await Promise.allSettled(
      tagsToCreate.flatMap(
        (tagName) =>
          tagsClient?.create({
            name: tagName,
            description: '',
            color: getRandomColor(),
          }) ?? []
      )
    );

    for (const result of tagCreationResults) {
      if (result.status === 'rejected') {
        this.logger.error(`Error creating tag: ${result.reason}`);
      } else {
        this.logger.info(`Tag created: ${result.value.name}`);
      }
    }

    const createdTags = tagCreationResults
      .filter((result): result is PromiseFulfilledResult<Tag> => result.status === 'fulfilled')
      .map((result) => result.value);

    // Remove tags that were not created
    const invalidTagNames = tagsToCreate.filter(
      (tagName) => !createdTags.some((tag) => tag.name === tagName)
    );
    invalidTagNames.forEach((tagName) => tagNames.delete(tagName));

    // Add newly created tags to allTags
    allTags.push(...createdTags);

    const combinedTagNames = new Set([
      ...tagNames,
      ...createdTags.map((createdTag) => createdTag.name),
    ]);
    return combinedTagNames;
  }

  async get(ctx: StorageContext, id: string): Promise<DashboardGetOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);
    const tagsClient = this.savedObjectsTagging?.createTagClient({ client: soClient });
    const allTags = (await tagsClient?.getAll()) ?? [];
    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<DashboardSavedObjectAttributes>(DASHBOARD_SAVED_OBJECT_TYPE, id);

    const { item, error: itemError } = await savedObjectToItem(savedObject, false, {
      getTagNamesFromReferences: (references: SavedObjectReference[]) =>
        this.getTagNamesFromReferences(references, allTags),
    });
    if (itemError) {
      throw Boom.badRequest(`Invalid response. ${itemError.message}`);
    }

    const response = { item, meta: { aliasPurpose, aliasTargetId, outcome } };

    const validationError = transforms.get.out.result.validate(response);
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate response and DOWN transform to the request version
    const { value, error: resultError } = transforms.get.out.result.down<
      DashboardGetOut,
      DashboardGetOut
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
    throw new Error(`[bulkGet] has not been implemented. See DashboardStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: DashboardAttributes,
    options: DashboardCreateOptions
  ): Promise<DashboardCreateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);
    const tagsClient = this.savedObjectsTagging?.createTagClient({ client: soClient });
    const allTags = tagsClient ? await tagsClient?.getAll() : [];

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      DashboardAttributes,
      DashboardAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      DashboardCreateOptions,
      DashboardCreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const {
      attributes: soAttributes,
      references: soReferences,
      error: transformDashboardError,
    } = await transformDashboardIn({
      dashboardState: dataToLatest,
      replaceTagReferencesByName: ({ references, newTagNames }) =>
        this.replaceTagReferencesByName(references, newTagNames, allTags, tagsClient),
      incomingReferences: options.references,
    });
    if (transformDashboardError) {
      throw Boom.badRequest(`Invalid data. ${transformDashboardError.message}`);
    }

    // Save data in DB
    const savedObject = await soClient.create<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      soAttributes,
      { ...optionsToLatest, references: soReferences }
    );

    const { item, error: itemError } = savedObjectToItem(savedObject, false, {
      getTagNamesFromReferences: (references: SavedObjectReference[]) =>
        this.getTagNamesFromReferences(references, allTags),
    });
    if (itemError) {
      throw Boom.badRequest(`Invalid response. ${itemError.message}`);
    }

    const validationError = transforms.create.out.result.validate({ item });
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      CreateResult<DashboardItem>
    >(
      { item },
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
    data: DashboardAttributes,
    options: DashboardUpdateOptions
  ): Promise<DashboardUpdateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);
    const tagsClient = this.savedObjectsTagging?.createTagClient({ client: soClient });
    const allTags = (await tagsClient?.getAll()) ?? [];

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      DashboardAttributes,
      DashboardAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      DashboardUpdateOptions,
      DashboardUpdateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const {
      attributes: soAttributes,
      references: soReferences,
      error: transformDashboardError,
    } = await transformDashboardIn({
      dashboardState: dataToLatest,
      replaceTagReferencesByName: ({ references, newTagNames }) =>
        this.replaceTagReferencesByName(references, newTagNames, allTags, tagsClient),
      incomingReferences: options.references,
    });
    if (transformDashboardError) {
      throw Boom.badRequest(`Invalid data. ${transformDashboardError.message}`);
    }

    // Save data in DB
    const partialSavedObject = await soClient.update<DashboardSavedObjectAttributes>(
      DASHBOARD_SAVED_OBJECT_TYPE,
      id,
      soAttributes,
      { ...optionsToLatest, references: soReferences }
    );

    const { item, error: itemError } = savedObjectToItem(partialSavedObject, true, {
      getTagNamesFromReferences: (references: SavedObjectReference[]) =>
        this.getTagNamesFromReferences(references, allTags),
    });
    if (itemError) {
      throw Boom.badRequest(`Invalid response. ${itemError.message}`);
    }

    const validationError = transforms.update.out.result.validate({ item });
    if (validationError) {
      if (this.throwOnResultValidationError) {
        throw Boom.badRequest(`Invalid response. ${validationError.message}`);
      } else {
        this.logger.warn(`Invalid response. ${validationError.message}`);
      }
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.update.out.result.down<
      DashboardUpdateOut,
      DashboardUpdateOut
    >(
      { item },
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
  ): Promise<DeleteResult> {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(DASHBOARD_SAVED_OBJECT_TYPE, id, { force: options?.force ?? false });
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: DashboardSearchOptions
  ): Promise<DashboardSearchOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);
    const tagsClient = this.savedObjectsTagging?.createTagClient({ client: soClient });
    const allTags = (await tagsClient?.getAll()) ?? [];

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      DashboardSearchOptions,
      DashboardSearchOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const soQuery = searchArgsToSOFindOptions(query, optionsToLatest);
    // Execute the query in the DB
    const soResponse = await soClient.find<DashboardSavedObjectAttributes>(soQuery);
    const hits = await Promise.all(
      soResponse.saved_objects
        .map(async (so) => {
          const { item } = savedObjectToItem(so, false, {
            allowedAttributes: soQuery.fields,
            allowedReferences: optionsToLatest?.includeReferences,
            getTagNamesFromReferences: (references: SavedObjectReference[]) =>
              this.getTagNamesFromReferences(references, allTags),
          });
          return item;
        })
        // Ignore any saved objects that failed to convert to items.
        .filter((item) => item !== null)
    );
    const response = {
      hits,
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
      DashboardSearchOut,
      DashboardSearchOut
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
