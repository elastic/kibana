/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { SearchIn } from '../../../common';
import type { StorageContext, ContentCrud } from '../../core';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { validate } from '../../utils';

export const search: ProcedureDefinition<Context, SearchIn<string>> = {
  schemas: rpcSchemas.search,
  fn: async (ctx, { contentTypeId, query, options }) => {
    const contentDefinition = ctx.contentRegistry.getDefinition(contentTypeId);
    const { search: schemas } = contentDefinition.schemas.content;

    // Validate query to execute
    if (schemas?.in?.query) {
      const error = validate(query, schemas.in.query);
      if (error) {
        // TODO: Improve error handling
        throw error;
      }
    } else {
      // TODO: Improve error handling
      throw new Error('Schema missing for rpc procedure [search.in.query].');
    }

    // Validate the possible options
    if (options) {
      if (!schemas.in?.options) {
        // TODO: Improve error handling
        throw new Error('Schema missing for rpc procedure [search.in.options].');
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
    const result = await crudInstance.search(storageContext, query, options);

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
