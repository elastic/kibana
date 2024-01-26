/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { rpcSchemas } from '../../../common/schemas';
import type { UpdateIn } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { getStorageContext } from './utils';

export const update: ProcedureDefinition<Context, UpdateIn<string>> = {
  schemas: rpcSchemas.update,
  fn: async (ctx, { contentTypeId, id, version, data, options }) => {
    const storageContext = getStorageContext({
      contentTypeId,
      version,
      ctx,
    });
    const crudInstance = ctx.contentRegistry.getCrud(contentTypeId);
    return crudInstance.update(storageContext, id, data, options);
  },
};
