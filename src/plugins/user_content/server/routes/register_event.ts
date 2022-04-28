/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';

import { withApiBaseBath, metadataEventTypes, MetadataEventType } from '../../common';
import type { RouteDependencies } from './types';

export const registerRegisterEventRoute = (
  router: IRouter,
  { userContentEventStreamPromise }: RouteDependencies
) => {
  router.post(
    {
      path: withApiBaseBath('/event/{eventType}'),
      validate: {
        params: schema.object({
          eventType: schema.oneOf(
            metadataEventTypes.map((eventType) => schema.literal(eventType)) as [
              Type<MetadataEventType>
            ]
          ),
        }),
        body: schema.object({
          soId: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { body, params } = req;

      const userContentEventStream = await userContentEventStreamPromise;

      userContentEventStream.registerEvent({
        type: params.eventType,
        data: {
          so_id: body.soId,
        },
      });

      return res.ok({
        body: 'ok',
      });
    })
  );
};
