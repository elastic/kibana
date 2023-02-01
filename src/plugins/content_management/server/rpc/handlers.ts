/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CreateIn, GetIn, ProcedureName } from '../../common';
import { rpcSchemas } from '../../common';
import type { FunctionHandler, ProcedureConfig } from './function_handler';
import { Context } from './types';

export function initRpcHandlers({
  fnHandler,
}: {
  fnHandler: FunctionHandler<Context, ProcedureName>;
}) {
  fnHandler.register<ProcedureConfig<Context, GetIn>>('get', {
    schemas: rpcSchemas.get,
    fn: async (ctx, input) => {
      if (!input) {
        throw new Error(`Input data missing for procedur [get].`);
      }

      if (!input.contentType) {
        throw new Error(`Content type not provided in input procedure [get].`);
      }

      const contentConfig = ctx.contentRegistry.getConfig(input.contentType);

      if (!contentConfig) {
        throw new Error(`Invalid contentType [${input.contentType}]`);
      }

      const { get: schemas } = contentConfig.schemas.content;

      if (input.options) {
        // Validate the options provided
        if (!schemas.in?.options) {
          throw new Error(`Schema missing for rpc call [get.in.options].`);
        }
        const validation = schemas.in.options.getSchema().validate(input.options);
        if (validation.error) {
          throw validation.error;
        }
      }

      // Execute CRUD
      const crudInstance = ctx.core.crud(input.contentType);
      const options = {
        ...(input?.options ?? {}),
        requestHandlerContext: ctx.requestHandlerContext,
      };
      const result = await crudInstance.get(input.id, options);

      // Validate result
      const validation = schemas.out.result.getSchema().validate(result);
      if (validation.error) {
        throw validation.error;
      }

      return result;
    },
  });

  fnHandler.register<ProcedureConfig<Context, CreateIn>>('create', {
    schemas: rpcSchemas.create,
    fn: async (ctx, input) => {
      if (!input) {
        throw new Error(`Input data missing for procedur [get].`);
      }

      if (!input.contentType) {
        throw new Error(`Content type not provided in input procedure [get].`);
      }

      const contentConfig = ctx.contentRegistry.getConfig(input.contentType);

      if (!contentConfig) {
        throw new Error(`Invalid contentType [${input.contentType}]`);
      }

      const { create: schemas } = contentConfig.schemas.content;

      if (input.options) {
        // Validate the options provided
        if (!schemas.in?.options) {
          throw new Error(`Schema missing for rpc call [get.in.options].`);
        }
        const validation = schemas.in.options.getSchema().validate(input.options);
        if (validation.error) {
          throw validation.error;
        }
      }

      const crudInstance = ctx.core.crud(input.contentType);
      const options = {
        ...(input.options ?? {}),
        requestHandlerContext: ctx.requestHandlerContext,
      };

      const result = crudInstance.create(input.data, options);

      // Validate result
      const validation = schemas.out.result.getSchema().validate(result);
      if (validation.error) {
        throw validation.error;
      }

      return result;
    },
  });
}
