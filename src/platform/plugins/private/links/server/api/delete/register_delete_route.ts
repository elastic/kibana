/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VersionedRouter } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { commonRouteConfig, LINKS_ID_DESCRIPTION } from '../constants';
import { deleteLinks } from './delete';
import { LINKS_API_PATH, PUBLIC_API_VERSION } from '../../../common/constants';
import { deleteLinksOASOperationObject } from '../oas_examples';

export const LINKS_DELETE_DESCRIPTION = 'Permanently deletes a links library item by ID.' as const;

export function registerDeleteRoute(router: VersionedRouter<RequestHandlerContext>) {
  const deleteRoute = router.delete({
    path: `${LINKS_API_PATH}/{id}`,
    summary: `Delete a links library item.`,
    ...commonRouteConfig,
    description: LINKS_DELETE_DESCRIPTION,
  });

  deleteRoute.addVersion(
    {
      version: PUBLIC_API_VERSION,
      options: {
        oasOperationObject: () => deleteLinksOASOperationObject,
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string({
              meta: {
                description: LINKS_ID_DESCRIPTION,
              },
            }),
          }),
        },
        response: {
          204: {
            description: 'deleted',
          },
          403: {
            description: 'forbidden',
          },
          404: {
            description: 'not found',
          },
        },
      },
    },
    async (ctx, req, res) => {
      try {
        await deleteLinks(ctx, req.params.id);
      } catch (e) {
        if (e.isBoom && e.output.statusCode === 404) {
          return res.notFound({
            body: {
              message: `A links library item with ID ${req.params.id} was not found.`,
            },
          });
        }
        if (e.isBoom && e.output.statusCode === 403) {
          return res.forbidden({ body: { message: e.message } });
        }
        return res.badRequest({ body: { message: e.message } });
      }

      return res.noContent();
    }
  );
}
