/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common';
import type { CreateIn } from '../../../common';
import type { StorageContext, ContentCrud } from '../../core';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';

export const create: ProcedureDefinition<Context, CreateIn<string>> = {
  schemas: rpcSchemas.create,
  fn: async (ctx, input) => {
    if (!input) {
      throw new Error(`Input data missing for procedur [create].`);
    }

    if (!input.contentTypeId) {
      throw new Error(`Content type not provided in input procedure [create].`);
    }

    const contentDefinition = ctx.contentRegistry.getDefinition(input.contentTypeId);

    if (!contentDefinition) {
      // TODO: Improve error handling
      throw new Error(`Invalid contentType [${input.contentTypeId}]`);
    }

    const { create: schemas } = contentDefinition.schemas.content;

    // Validate data to be stored
    if (schemas.in.data) {
      const validation = schemas.in.data.getSchema().validate(input.data);
      if (validation.error) {
        const message = `${validation.error.message}. ${JSON.stringify(validation.error)}`;
        throw new Error(message);
      }
    } else {
      // TODO: Improve error handling
      throw new Error('Schema missing for rpc call [create.in.data].');
    }

    // Validate the possible options
    if (input.options) {
      if (!schemas.in?.options) {
        // TODO: Improve error handling
        throw new Error('Schema missing for rpc call [create.in.options].');
      }
      const validation = schemas.in.options.getSchema().validate(input.options);
      if (validation.error) {
        const message = `${validation.error.message}. ${JSON.stringify(validation.error)}`;
        throw new Error(message);
      }
    }

    // Execute CRUD
    const crudInstance: ContentCrud = ctx.contentRegistry.getCrud(input.contentTypeId);
    const storageContext: StorageContext = {
      requestHandlerContext: ctx.requestHandlerContext,
    };
    const result = crudInstance.create(storageContext, input.data, input.options);

    // Validate result
    const resultSchema = schemas.out?.result;
    if (resultSchema) {
      const validation = resultSchema.getSchema().validate(result);
      if (validation.error) {
        // TODO: Improve error handling
        throw validation.error;
      }
    }

    return result;
  },
};
