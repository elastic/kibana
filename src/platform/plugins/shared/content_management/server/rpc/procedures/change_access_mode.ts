/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';

import { rpcSchemas } from '../../../common/schemas';
import type { ChangeAccessModeIn, ChangeAccessModeResult } from '../../../common';
import type { ProcedureDefinition } from '../rpc_service';
import type { Context } from '../types';
import { getChangeAccessModeClientFactory } from '../../content_client';
import { ChangeAccessModeService } from '../../core/change_access_mode';

export const getChangeAccessMode = (
  logger: Logger
): ProcedureDefinition<Context, ChangeAccessModeIn, ChangeAccessModeResult> => ({
  schemas: rpcSchemas.changeAccessMode,
  fn: async (ctx, { version, objects, options }) => {
    const changeAccessModeService = new ChangeAccessModeService({
      contentRegistry: ctx.contentRegistry,
    });

    const clientFactory = getChangeAccessModeClientFactory({
      contentRegistry: ctx.contentRegistry,
      changeAccessModeService,
      logger,
    });
    const changeAccessModeClient = clientFactory(ctx);

    return changeAccessModeClient.changeAccessMode({ version, objects, options });
  },
});
