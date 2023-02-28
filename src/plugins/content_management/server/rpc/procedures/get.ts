/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { GetIn } from '../../../common';
import type { ContentCrud, StorageContext } from '../../core';
import { validate } from '../../utils';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';

export const get: ProcedureDefinition<Context, GetIn<string>> = {
  schemas: rpcSchemas.get,
  fn: async (ctx, input) => {
    const contentDefinition = ctx.contentRegistry.getDefinition(input.contentTypeId);
    const { get: schemas } = contentDefinition.schemas.content;

    if (input.options) {
      // Validate the options provided
      if (!schemas?.in?.options) {
        throw new Error(`Schema missing for rpc procedure [get.in.options].`);
      }
      const error = validate(input.options, schemas.in.options);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    }

    // Execute CRUD
    const crudInstance: ContentCrud = ctx.contentRegistry.getCrud(input.contentTypeId);
    const storageContext: StorageContext = {
      requestHandlerContext: ctx.requestHandlerContext,
    };
    const result = await crudInstance.get(storageContext, input.id, input.options);

    // Validate result
    const resultSchema = schemas?.out?.result;
    if (resultSchema) {
      const error = validate(result.item, resultSchema);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    }

    return result;
  },
};
