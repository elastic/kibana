/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { MSearchIn, MSearchOut } from '../../../common';
import type { StorageContext } from '../../core';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { validateRequestVersion } from './utils';

export const mSearch: ProcedureDefinition<Context, MSearchIn, MSearchOut> = {
  schemas: rpcSchemas.mSearch,
  fn: async (ctx, { contentTypes: contentTypes, query }) => {
    const contentTypesWithStorageContext = contentTypes.map(
      ({ contentTypeId, version: _version }) => {
        const contentDefinition = ctx.contentRegistry.getDefinition(contentTypeId);
        const version = validateRequestVersion(_version, contentDefinition.version.latest);
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

        return {
          contentTypeId,
          ctx: storageContext,
        };
      }
    );

    const result = await ctx.mSearchService.search(contentTypesWithStorageContext, query);

    return {
      contentTypes,
      result,
    };
  },
};
