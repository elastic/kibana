/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { Logger } from '@kbn/logging';
import type { ContentStorage, StorageContext } from '@kbn/content-management-plugin/server';
import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { SavedObject, SavedObjectsFindOptions } from '@kbn/core-saved-objects-api-server';
import { tagsToFindOptions } from '@kbn/content-management-utils';
import { omit } from 'lodash';
import { BookAttributes } from '../saved_object';
import { BOOK_CONTENT_ID, BOOK_SAVED_OBJECT_TYPE } from '../../../common';
import { cmServicesDefinition } from './schema/cm_services';
import { attributesToBook } from '../../../common/book/transforms/transform_out';
import { BookSearchOptions, BookState } from './schema/latest';
import { bookToAttributes } from '../saved_object/book_to_attributes';

const getFindOptions = (
  query: SearchQuery,
  options: BookSearchOptions
): SavedObjectsFindOptions => {
  return {
    type: BOOK_SAVED_OBJECT_TYPE,
    searchFields: ['title'],
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

export class BookStorage implements ContentStorage {
  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  private readonly logger: Logger;

  mSearch = {
    savedObjectType: BOOK_SAVED_OBJECT_TYPE,
    toItemResult: (ctx: StorageContext, savedObject: SavedObject<unknown>) => {
      const transforms = ctx.utils.getTransforms(cmServicesDefinition);

      let item;

      try {
        item = attributesToBook((savedObject as SavedObject<BookAttributes>).attributes);
      } catch (error) {
        this.logger.error(`Error transforming saved book attributes: ${error.message}`);
        throw Boom.badRequest(`Invalid response. ${error.message}`);
      }

      const response = {
        id: savedObject.id,
        attributes: {
          ...item,
          name: item.bookTitle,
          title: item.bookTitle,
        },
        type: BOOK_CONTENT_ID,
      };

      const { value, error: resultError } = transforms.mSearch.out.result.down(
        response,
        undefined,
        {
          validate: false,
        }
      );

      if (resultError) {
        this.logger.error(`Error transforming saved book attributes: ${resultError.message}`);
        throw Boom.badRequest(`Invalid response. ${resultError.message}`);
      }

      return value;
    },
  };

  async get(ctx: StorageContext, id: string) {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    const { saved_object: savedObject } = await soClient.resolve<BookAttributes>(
      BOOK_SAVED_OBJECT_TYPE,
      id
    );

    let item;

    try {
      item = attributesToBook(savedObject.attributes);
    } catch (error) {
      this.logger.error(`Error transforming saved book attributes: ${error.message}`);
      throw Boom.badRequest(`Invalid response. ${error.message}`);
    }

    const response = { item };

    const { value, error: resultError } = transforms.get.out.result.down(response, undefined, {
      validate: false,
    });

    if (resultError) {
      this.logger.error(`Error transforming saved book attributes: ${resultError.message}`);
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }
    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See DashboardStorage class.`);
  }

  async create(ctx: StorageContext, data: BookState, options?: object | undefined) {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      BookState,
      BookState
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    let attributes: BookAttributes;
    try {
      attributes = bookToAttributes(dataToLatest);
    } catch (error) {
      throw Boom.badRequest(`Invalid data. ${error.message}`);
    }

    const savedObject = await soClient.create<BookAttributes>(
      BOOK_SAVED_OBJECT_TYPE,
      attributes,
      options
    );

    let item: BookState;
    try {
      item = attributesToBook(savedObject.attributes);
    } catch (error) {
      throw Boom.badRequest(`Invalid response. ${error.message}`);
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down(
      { item, meta: omit(savedObject, 'attributes') },
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async update(ctx: StorageContext, id: string, data: BookState, options?: object | undefined) {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      BookState,
      BookState
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid data. ${dataError.message}`);
    }

    let attributes: BookAttributes;
    try {
      attributes = bookToAttributes(dataToLatest);
    } catch (error) {
      throw Boom.badRequest(`Invalid data. ${error.message}`);
    }

    const savedObject = await soClient.update<BookAttributes>(
      BOOK_SAVED_OBJECT_TYPE,
      id,
      attributes,
      options
    );

    let item: BookState;

    try {
      item = attributesToBook((savedObject as SavedObject<BookAttributes>).attributes);
    } catch (error) {
      throw Boom.badRequest(`Invalid response. ${error.message}`);
    }

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down(
      { item, meta: omit(savedObject, 'attributes') },
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    return value;
  }

  async delete(ctx: StorageContext, id: string, options?: object | undefined) {
    const soClient = await savedObjectClientFromRequest(ctx);
    await soClient.delete(BOOK_SAVED_OBJECT_TYPE, id, options);
    return { success: true };
  }

  async search(ctx: StorageContext, query: SearchQuery, options?: object | undefined) {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    const findOptions = getFindOptions(query, options);

    const soResponse = await soClient.find<BookAttributes>(findOptions);
    const hits = await Promise.all(
      soResponse.saved_objects
        .map(async (so) => {
          const item = attributesToBook(so.attributes);
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

    // Validate the response and DOWN transform to the request version
    const { value, error: resultError } = transforms.search.out.result.down(
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
