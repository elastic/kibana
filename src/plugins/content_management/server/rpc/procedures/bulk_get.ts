/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { rpcSchemas } from '../../../common/schemas';
import type { BulkGetIn } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { BulkGetResponse } from '../../core/crud';
import { getStorageContext } from './utils';

export const bulkGet: ProcedureDefinition<Context, BulkGetIn<string>, BulkGetResponse> = {
  schemas: rpcSchemas.bulkGet,
  fn: async (ctx, { contentTypeId, version, ids, options }) => {
    const storageContext = getStorageContext({
      contentTypeId,
      version,
      ctx,
    });

    const crudInstance = ctx.contentRegistry.getCrud(contentTypeId);
    return crudInstance.bulkGet(storageContext, ids, options);
  },
};
