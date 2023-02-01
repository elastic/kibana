/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { Logger, IRouter, ResponseError, CustomHttpResponseOptions } from '@kbn/core/server';

import { procedureNames } from '../../common';
import type { FunctionHandler } from './function_handler';
import type { Context } from './types';

// @ts-expect-error We add this if condition so we can ignore in our "params" validation below
if (procedureNames.length === 0) {
  throw new Error(`No function names declared to validate RPC routes.`);
}

export function initRpcRoutes(
  router: IRouter,
  {
    wrapError,
    fnHandler,
    context: rpcContext,
  }: {
    logger: Logger;
    wrapError: (error: any) => CustomHttpResponseOptions<ResponseError>;
    fnHandler: FunctionHandler<Context>;
    context: Context;
  }
) {
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
        body: schema.maybe(schema.object({}, { unknowns: 'allow' })),
      },
    },
    async (_context, request, response) => {
      try {
        const context = { ...rpcContext, requestHandlerContext: _context };
        const { name } = request.params;

        const result = await fnHandler.call(
          {
            name,
            input: request.body,
          },
          context
        );

        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    }
  );
}
