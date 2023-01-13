/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  SearchIn,
  SearchOut,
  Content,
  CreateIn,
  CreateOut,
  GetDetailsIn,
  GetDetailsOut,
  GetPreviewIn,
  GetPreviewOut,
} from '../../common';
import { schemas } from '../../common';
import { FunctionHandler } from './function_handler';
import { Context } from './types';

export function initRpcHandlers(fnHandler: FunctionHandler<Context>) {
  fnHandler.register('search', {
    schemas: schemas.api.search,
    fn: async (ctx, input: SearchIn): Promise<SearchOut> => {
      const response = await ctx.core.searchIndexer.search({});
      if (!Array.isArray(response.hits?.hits)) {
        return {
          total: 0,
          hits: [],
        };
      }
      return {
        total: response.hits.total! as number,
        hits: response.hits.hits.map((hit) => ({ ...(hit._source as Content), id: hit._id })),
      };
    },
  });

  fnHandler.register('get', {
    schemas: schemas.api.create,
    fn: async (ctx, input: GetDetailsIn): Promise<GetDetailsOut> => {
      const crudInstance = ctx.core.crud(input.type);
      const options = {
        ...(input.options ?? {}),
        requestHandlerContext: ctx.requestHandlerContext,
      };
      return crudInstance.get(input.id, options);
    },
  });

  fnHandler.register('getPreview', {
    schemas: schemas.api.create,
    fn: async (ctx, input: GetPreviewIn): Promise<GetPreviewOut> => {
      // We read the content preview from the Search index
      const response = await ctx.core.searchIndexer.getById(input.type, input.id);

      if (!response.hits) {
        // TODO: improve Error handling. We want to return a 404 here
        throw new Error(`Content [${input.type} | ${input.id}] not found.`);
      }

      const [content = { _id: '', _source: {} }] = response.hits?.hits ?? [];

      return {
        ...(content._source as Content),
        id: content._id,
      };
    },
  });

  fnHandler.register('create', {
    schemas: schemas.api.create,
    fn: async (ctx, input: CreateIn): Promise<CreateOut> => {
      const crudInstance = ctx.core.crud(input.type);
      const options = {
        ...(input.options ?? {}),
        requestHandlerContext: ctx.requestHandlerContext,
      };
      return crudInstance.create(input.data, options);
    },
  });
}
