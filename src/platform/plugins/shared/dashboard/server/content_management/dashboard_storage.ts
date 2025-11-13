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

import type {
  CreateResult,
  DeleteResult,
  SearchQuery,
} from '@kbn/content-management-plugin/common';
import type { StorageContext } from '@kbn/content-management-plugin/server';
import {
  DASHBOARD_SAVED_OBJECT_TYPE,
  type DashboardSavedObjectAttributes,
} from '../dashboard_saved_object';
import { cmServicesDefinition } from './cm_services';
import { savedObjectToItem, transformDashboardIn } from './latest';
import type {
  DashboardState,
  DashboardCreateOptions,
  DashboardUpdateOptions,
  DashboardSearchOptions,
  DashboardItem,
  DashboardGetOut,
} from './latest';
import type { DashboardCreateOut, DashboardSearchOut, DashboardUpdateOut } from './v1/types';
import { getSavedObjectFindOptions } from './get_saved_object_find_options';

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
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
  }) {
    this.logger = logger;
    this.throwOnResultValidationError = throwOnResultValidationError ?? false;
  }

  private logger: Logger;
  private throwOnResultValidationError: boolean;

  async get(ctx: StorageContext, id: string): Promise<DashboardGetOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);
    // Save data in DB

    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<DashboardSavedObjectAttributes>(DASHBOARD_SAVED_OBJECT_TYPE, id);

    const { item, error: itemError } = savedObjectToItem(savedObject, false);
    if (itemError) {
      throw Boom.badRequest(`Invalid response. ${itemError.message}`);
    }

    const response = { item, meta: { aliasPurpose, aliasTargetId, outcome } };
    console.log({ response });
    const validationError = transforms.get.out.result.validate(response);
    console.log({ validationError });
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
      // @ts-expect-error - fix type error
      response,
      undefined, // do not override version
      { validate: false } // validation is done above
    );

    if (resultError) {
      throw Boom.badRequest(`Invalid response. ${resultError.message}`);
    }

    console.log({ value });
    return value;
  }

  async bulkGet(): Promise<never> {
    // Not implemented
    throw new Error(`[bulkGet] has not been implemented. See DashboardStorage class.`);
  }

  async create(
    ctx: StorageContext,
    data: DashboardState,
    options: DashboardCreateOptions
  ): Promise<DashboardCreateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      DashboardState,
      DashboardState
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
    } = transformDashboardIn({
      dashboardState: dataToLatest,
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

    const { item, error: itemError } = savedObjectToItem(savedObject, false);

    if (itemError) {
      throw Boom.badRequest(`Invalid response. ${itemError.message}`);
    }
    const validationError = transforms.create.out.result.validate(item);
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
    data: DashboardState,
    options: DashboardUpdateOptions
  ): Promise<DashboardUpdateOut> {
    const transforms = ctx.utils.getTransforms(cmServicesDefinition);
    const soClient = await savedObjectClientFromRequest(ctx);

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.update.in.data.up<
      DashboardState,
      DashboardState
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
    } = transformDashboardIn({
      dashboardState: dataToLatest,
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

    const { item, error: itemError } = savedObjectToItem(partialSavedObject, true);
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

    // Validate and UP transform the options
    const { value: optionsToLatest, error: optionsError } = transforms.search.in.options.up<
      DashboardSearchOptions,
      DashboardSearchOptions
    >(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    // Execute the query in the DB
    const soResponse = await soClient.find<DashboardSavedObjectAttributes>(
      getSavedObjectFindOptions(query, optionsToLatest)
    );
    const hits = soResponse.saved_objects
      .map((so) => {
        const { item } = savedObjectToItem(so, false, {
          // TODO remove allowedAttributes, fields are already filtered at saved object level
          allowedAttributes: optionsToLatest?.fields,
          allowedReferences: optionsToLatest?.includeReferences,
        });
        return item;
      })
      // Ignore any saved objects that failed to convert to items.
      .filter((item) => item !== null);
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
}
