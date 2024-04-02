/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

import { LISTING_LIMIT_SETTING, PER_PAGE_SETTING } from '@kbn/saved-objects-settings';
import { ProcedureName } from '../../../common';
import type { ContentRegistry } from '../../core';
import { MSearchService } from '../../core/msearch';

import type { RpcService } from '../rpc_service';
import type { Context as RpcContext } from '../types';
import { wrapError } from './error_wrapper';

interface RouteContext {
  rpc: RpcService<RpcContext, ProcedureName>;
  contentRegistry: ContentRegistry;
}

export function initRpcRoutes(
  procedureNames: readonly ProcedureName[],
  router: IRouter,
  { rpc, contentRegistry }: RouteContext
) {
  if (procedureNames.length === 0) {
    throw new Error(`No procedure names provided.`);
  }

  /**
   * @apiGroup ContentManagement
   *
   * @api {post} /content_management/rpc/{call} Execute RPC call
   * @apiName RPC
   */
  router.post(
    {
      path: '/api/content_management/rpc/{name}',
      validate: {
        params: schema.object({
          // @ts-ignore We validate above that procedureNames has at least one item
          // so we can ignore the "Target requires 1 element(s) but source may have fewer." TS error
          name: schema.oneOf(procedureNames.map((fnName) => schema.literal(fnName))),
        }),
        // Any object payload can be passed, we will validate the input when calling the rpc handler
        body: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      },
    },
    async (requestHandlerContext, request, response) => {
      try {
        const context: RpcContext = {
          contentRegistry,
          requestHandlerContext,
          request,
          mSearchService: new MSearchService({
            getSavedObjectsClient: async () =>
              (await requestHandlerContext.core).savedObjects.client,
            contentRegistry,
            getConfig: {
              listingLimit: async () =>
                (await requestHandlerContext.core).uiSettings.client.get(LISTING_LIMIT_SETTING),
              perPage: async () =>
                (await requestHandlerContext.core).uiSettings.client.get(PER_PAGE_SETTING),
            },
          }),
        };
        const { name } = request.params as { name: ProcedureName };

        const result = await rpc.call(context, name, request.body);

        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );
}
