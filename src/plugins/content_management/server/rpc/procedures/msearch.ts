/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { MSearchIn, MSearchOut } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { getMSearchClientFactory } from '../../content_client';

export const mSearch: ProcedureDefinition<Context, MSearchIn, MSearchOut> = {
  schemas: rpcSchemas.mSearch,
  fn: async (ctx, { contentTypes, query }) => {
    const clientFactory = getMSearchClientFactory({
      contentRegistry: ctx.contentRegistry,
      mSearchService: ctx.mSearchService,
    });
    const mSearchClient = clientFactory(ctx);

    return mSearchClient.msearch({ contentTypes, query });
  },
};
