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

import type { StorageContext } from '@kbn/content-management-plugin/server';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../dashboard_saved_object';
import { cmServicesDefinition } from './cm_services';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { savedObjectToItem } from './latest';
import type { DashboardGetOut } from './latest';

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

  async update(): Promise<any> {
    throw Boom.badRequest(`Use REST API update endpoint`);
  }

  async delete(): Promise<any> {
    throw Boom.badRequest(`Use REST API delete endpoint`);
  }

  async search(): Promise<any> {
    throw Boom.badRequest(`Use REST API search endpoint`);
  }
}
