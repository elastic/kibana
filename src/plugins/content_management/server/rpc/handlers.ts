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
    // Get single content
    register(Calls.get)(async (ctx, payload) => {
      const crudInstance = ctx.core.crud(payload.type);
      return crudInstance.get(payload.id);
    });

    // Create a content
    register(Calls.create)(async (ctx, payload) => {
      const crudInstance = ctx.core.crud(payload.type);
      return crudInstance.create(payload.data);
    });
  });
}
