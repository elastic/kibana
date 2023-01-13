/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Calls } from '../../common';
import { FunctionHandler } from './function_handler';
import { Context } from './types';

export function initRpcHandlers(fnHandler: FunctionHandler<Context>) {
  fnHandler.load((register) => {
    // Get preview of a content
    register(Calls.getPreview)(async (ctx, payload) => {
      const response = await ctx.core.searchIndexer.getById(payload.type, payload.id);
      const [item = { _id: '', _source: {} }] = response.hits?.hits ?? [];

      return {
        id: item._id,
        ...(item._source as any), // adding "any" to move forward...
      };
    });

    // Get single content
    register(Calls.get)(async (ctx, payload) => {
      ctx.core.eventBus.emit({
        type: 'getItemStart',
        contentType: payload.type,
        contentId: payload.id,
      });

      const crudInstance = ctx.core.crud(payload.type);
      const content = await crudInstance.get(payload.id, {
        requestHandlerContext: ctx.requestHandlerContext,
      });

      ctx.core.eventBus.emit({
        type: 'getItemSuccess',
        contentType: payload.type,
        contentId: payload.id,
        data: content,
      });

      return content;
    });

    // Create a content
    register(Calls.create)(async (ctx, payload) => {
      const crudInstance = ctx.core.crud(payload.type);
      const contentCreated = await crudInstance.create(payload.data as any, {
        requestHandlerContext: ctx.requestHandlerContext,
      });

      ctx.core.eventBus.emit({
        type: 'createItemSuccess',
        contentType: payload.type,
        data: contentCreated,
      });

      return contentCreated;
    });

    register(Calls.search)(async (ctx, payload) => {
      const { hits } = await ctx.core.searchIndexer.search({});
      return hits;
    });
  });
}
