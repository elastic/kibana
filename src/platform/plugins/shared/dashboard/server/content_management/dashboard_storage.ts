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

import type { DeleteResult } from '@kbn/content-management-plugin/common';
import type { StorageContext } from '@kbn/content-management-plugin/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../dashboard_saved_object';
import { cmServicesDefinition } from './cm_services';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { savedObjectToItem, transformDashboardIn } from './latest';
import type { DashboardState, DashboardUpdateOptions, DashboardGetOut } from './latest';

import type { DashboardUpdateOut } from './v1/types';

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
    isAccessControlEnabled,
  }: {
    logger: Logger;
    throwOnResultValidationError: boolean;
    isAccessControlEnabled: boolean;
  }) {
    this.logger = logger;
    this.throwOnResultValidationError = throwOnResultValidationError ?? false;
    this.isAccessControlEnabled = isAccessControlEnabled ?? false;
  }

  private logger: Logger;
  private throwOnResultValidationError: boolean;
  private isAccessControlEnabled: boolean;

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

    const { item, error: itemError } = savedObjectToItem(
      savedObject,
      false,
      this.isAccessControlEnabled
    );
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
    throw new Error(`[bulkGet] has not been implemented. See DashboardStorage class.`);
  }

  async create(): Promise<any> {
    throw Boom.badRequest(`Use REST API create endpoint`);
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

  async search(): Promise<any> {
    throw Boom.badRequest(`Use REST API search endpoint`);
  }
}
