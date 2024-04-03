/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { rpcSchemas } from '../../../common/schemas';
import type { UpdateIn } from '../../../common';
import { getContentClientFactory } from '../../content_client';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';

export const update: ProcedureDefinition<Context, UpdateIn<string>> = {
  schemas: rpcSchemas.update,
  fn: async (ctx, { contentTypeId, id, version, data, options }) => {
    const clientFactory = getContentClientFactory({
      contentRegistry: ctx.contentRegistry,
    });
    const client = clientFactory(contentTypeId).getForRequest({
      ...ctx,
      version,
    });

    return client.update(id, data, options);
  },
};
