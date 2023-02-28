/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { CreateIn } from '../../../common';
import type { StorageContext, ContentCrud } from '../../core';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { validate } from '../../utils';

export const create: ProcedureDefinition<Context, CreateIn<string>> = {
  schemas: rpcSchemas.create,
  fn: async (ctx, input) => {
    const contentDefinition = ctx.contentRegistry.getDefinition(input.contentTypeId);
    const { create: schemas } = contentDefinition.schemas.content;

    // Validate data to be stored
    if (schemas?.in?.data) {
      const error = validate(input.data, schemas.in.data);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    } else {
      // TODO: Improve error handling
      throw new Error('Schema missing for rpc procedure [create.in.data].');
    }

    // Validate the possible options
    if (input.options) {
      if (!schemas.in?.options) {
        // TODO: Improve error handling
        throw new Error('Schema missing for rpc procedure [create.in.options].');
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
    const result = await crudInstance.create(storageContext, input.data, input.options);

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
