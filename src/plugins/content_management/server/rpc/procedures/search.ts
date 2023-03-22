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
import { validateRequestVersion } from './utils';

export const search: ProcedureDefinition<Context, SearchIn<string>> = {
  schemas: rpcSchemas.search,
  fn: async (ctx, { contentTypeId, version: _version, query, options }) => {
    const contentDefinition = ctx.contentRegistry.getDefinition(contentTypeId);
    const version = validateRequestVersion(_version, contentDefinition.version.latest);

    // Execute CRUD
    const crudInstance: ContentCrud = ctx.contentRegistry.getCrud(contentTypeId);
    const storageContext: StorageContext = {
      requestHandlerContext: ctx.requestHandlerContext,
      version: {
        request: version,
        latest: contentDefinition.version.latest,
      },
      utils: {
        getTransforms: ctx.getTransformsFactory(contentTypeId),
      },
    };
    const result = await crudInstance.search(storageContext, query, options);

    return result;
  },
};
