/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { rpcSchemas } from '../../../common/schemas';
import type { UpdateIn } from '../../../common';
import type { StorageContext, ContentCrud } from '../../core';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { validate } from '../../utils';

export const update: ProcedureDefinition<Context, UpdateIn<string>> = {
  schemas: rpcSchemas.update,
  fn: async (ctx, { contentTypeId, id, data, options }) => {
    const contentDefinition = ctx.contentRegistry.getDefinition(contentTypeId);
    const { update: schemas } = contentDefinition.schemas.content;

    // Validate data to be stored
    if (schemas?.in?.data) {
      const error = validate(data, schemas.in.data);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    } else {
      // TODO: Improve error handling
      throw new Error('Schema missing for rpc procedure [update.in.data].');
    }

    // Validate the possible options
    if (options) {
      if (!schemas.in?.options) {
        // TODO: Improve error handling
        throw new Error('Schema missing for rpc procedure [update.in.options].');
      }
      const error = validate(options, schemas.in.options);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    }

    // Execute CRUD
    const crudInstance: ContentCrud = ctx.contentRegistry.getCrud(contentTypeId);
    const storageContext: StorageContext = {
      requestHandlerContext: ctx.requestHandlerContext,
    };
    const result = await crudInstance.update(storageContext, id, data, options);

    // Validate result
    const resultSchema = schemas.out?.result;
    if (resultSchema) {
      const error = validate(result.result, resultSchema);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    }

    return result;
  },
};
