/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rpcSchemas } from '../../../common/schemas';
import type { ChangeAccessModeIn } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { ChangeAccessModeService } from '../../core/change_access_mode';
import { getStorageContext, getServiceObjectTransformFactory } from '../../utils';

export const changeAccessMode: ProcedureDefinition<Context, ChangeAccessModeIn> = {
  schemas: rpcSchemas.changeAccessMode,
  fn: async (ctx, { version, objects, options }) => {
    const changeAccessModeService = new ChangeAccessModeService({
      contentRegistry: ctx.contentRegistry,
    });

    const objectsByType = objects.reduce((acc, obj) => {
      if (!acc[obj.type]) {
        acc[obj.type] = [];
      }
      acc[obj.type].push(obj);
      return acc;
    }, {} as Record<string, Array<{ type: string; id: string }>>);

    const objectsWithCtx = [];
    for (const [contentTypeId, typeObjects] of Object.entries(objectsByType)) {
      const storageContext = getStorageContext({
        contentTypeId,
        version,
        request: ctx.request,
        ctx: {
          contentRegistry: ctx.contentRegistry,
          requestHandlerContext: ctx.requestHandlerContext,
          getTransformsFactory: getServiceObjectTransformFactory,
        },
      });

      for (const obj of typeObjects) {
        objectsWithCtx.push({
          ...obj,
          ctx: storageContext,
        });
      }
    }

    return changeAccessModeService.changeAccessMode(objectsWithCtx, options);
  },
};
