/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { StorageContext } from '@kbn/content-management-plugin/server';
import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsFindOptions,
} from '@kbn/core-saved-objects-api-server';
import Boom from '@hapi/boom';
import type {
  CreateResult,
  DeleteResult,
  SearchQuery,
} from '@kbn/content-management-plugin/common';
import { LINKS_SAVED_OBJECT_TYPE } from '../../common';
import type { LinksItem, LinksSearchOut } from '../../common/content_management';
import { cmServicesDefinition } from './schema/cm_services';
import type {
  LinksCreateOptions,
  LinksCreateOut,
  LinksGetOut,
  LinksUpdateOptions,
  LinksUpdateOut,
  LinksSearchOptions,
  LinksState,
  StoredLinksState,
} from './schema/latest';
import { savedObjectToItem, itemToAttributes } from './schema/latest';

const savedObjectClientFromRequest = async (ctx: StorageContext) => {
  if (!ctx.requestHandlerContext) {
    throw new Error('Storage context.requestHandlerContext missing.');
  }

  const { savedObjects } = await ctx.requestHandlerContext.core;
  return savedObjects.client;
};

const searchArgsToSOFindOptions = (
  query: SearchQuery,
  options: LinksSearchOptions
): SavedObjectsFindOptions => {
  return {
    type: LINKS_SAVED_OBJECT_TYPE,
    searchFields: options?.onlyTitle ? ['title'] : ['title^3', 'description'],
    search: query.text,
    perPage: query.limit,
    page: query.cursor ? +query.cursor : undefined,
    defaultSearchOperator: 'AND',
  };
};

export class LinksStorage {
  constructor({
    logger,
    throwOnResultValidationError,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    this.logger = logger;
    this.throwOnResultValidationError = throwOnResultValidationError ?? false;
  }

  private logger: Logger;
  private throwOnResultValidationError: boolean;

  async get(ctx: StorageContext, id: string): Promise<LinksGetOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Save data in DB
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<StoredLinksState>(LINKS_SAVED_OBJECT_TYPE, id);

    const item = savedObjectToItem(savedObject);
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
    const { value, error: resultError } = transforms.get.out.result.down<LinksGetOut, LinksGetOut>(
      // @ts-expect-error - fix type error
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
    throw new Error(`[bulkGet] has not been implemented. See LinksStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: LinksState,
    options: LinksCreateOptions
  ): Promise<LinksCreateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      LinksState,
      LinksState
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.create.in.options.up<
      LinksCreateOptions,
      LinksCreateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const { attributes, references } = itemToAttributes(dataToLatest);

    // Save data in DB
    const savedObject = await soClient.create<StoredLinksState>(
      LINKS_SAVED_OBJECT_TYPE,
      attributes,
      { ...optionsToLatest, references }
    );

    const item = savedObjectToItem(savedObject);

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
      CreateResult<LinksItem>
    >(
      // @ts-expect-error - fix type error
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
    data: LinksState,
    options: LinksUpdateOptions
  ): Promise<LinksUpdateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      LinksState,
      LinksState
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } = transforms.update.in.options.up<
      LinksUpdateOptions,
      LinksUpdateOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid options. ${optionsError.message}`);
    }

    const { attributes, references } = itemToAttributes(dataToLatest);

    // Save data in DB
    const partialSavedObject = await soClient.update<StoredLinksState>(
      LINKS_SAVED_OBJECT_TYPE,
      id,
      attributes,
      {
        references: [
          ...references,
          ...((optionsToLatest.references as SavedObjectReference[]) ?? []),
        ],
      }
    );

    const item = savedObjectToItem(partialSavedObject);

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
      LinksUpdateOut,
      LinksUpdateOut
    >(
      // @ts-expect-error - fix type error
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
    await soClient.delete(LINKS_SAVED_OBJECT_TYPE, id, { force: options?.force ?? false });
    return { success: true };
  }

  async search(
    ctx: StorageContext,
    query: SearchQuery,
    options: LinksSearchOptions
  ): Promise<LinksSearchOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      LinksSearchOptions,
      LinksSearchOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    const soQuery = searchArgsToSOFindOptions(query, optionsToLatest);
    // Execute the query in the DB
    const soResponse = await soClient.find<StoredLinksState>(soQuery);
    const hits = await Promise.all(
      soResponse.saved_objects
        .map(async (so) => {
          const item = savedObjectToItem(so);
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
      LinksSearchOut,
      LinksSearchOut
    >(
      // @ts-expect-error - fix type error
      response,
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  mSearch = {
    savedObjectType: LINKS_SAVED_OBJECT_TYPE,
    toItemResult: (ctx: StorageContext, savedObject: SavedObject<StoredLinksState>): LinksItem => {
      const transforms = ctx.utils.getTransforms(cmServicesDefinition);

      const contentItem = savedObjectToItem(savedObject);

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
        LinksItem,
        LinksItem
      >(
        // @ts-expect-error - fix type error
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
