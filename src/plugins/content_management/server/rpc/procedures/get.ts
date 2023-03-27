/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { GetIn } from '../../../common';
import type { ContentCrud, StorageContext } from '../../core';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { validateRequestVersion } from './utils';

export const get: ProcedureDefinition<Context, GetIn<string>> = {
  schemas: rpcSchemas.get,
  fn: async (ctx, { contentTypeId, id, version: _version, options }) => {
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
    const result = await crudInstance.get(storageContext, id, options);

    return result;
  },
};
