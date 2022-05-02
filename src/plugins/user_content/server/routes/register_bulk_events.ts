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
  { userContentEventStreamPromise }: RouteDependencies
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

      const userContentEventStream = await userContentEventStreamPromise;

      userContentEventStream.bulkRegisterEvents(
        body.map(({ type, soId }) => ({
          type,
          data: {
            so_id: soId,
          },
        }))
      );

      return res.ok({
        body: 'ok',
      });
    })
  );
};
