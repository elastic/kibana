/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';

import { withApiBaseBath } from '../../common';
import { streamEvent } from './schemas';

import type { RouteDependencies } from './types';

export const registerBulkEventsRoute = (
  router: IRouter,
  { metadataEventsService }: RouteDependencies
) => {
  router.post(
    {
      path: withApiBaseBath('/event/_bulk'),
      validate: {
        body: schema.arrayOf(streamEvent),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { body } = req;

      const events = body.map(({ type, soId, soType }) => {
        return {
          type,
          data: {
            so_id: soId,
            so_type: soType,
          },
        };
      });

      await metadataEventsService.bulkRegisterEvents(events);

      return res.ok({
        body: 'ok',
      });
    })
  );
};
