/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { DEPRECATED_ROUTES } from '../../../common';

export const registerDeprecatedRoute = (router: IRouter) => {
  router.get(
    {
      path: DEPRECATED_ROUTES.DEPRECATED_ROUTE,
      validate: false,
      options: {
        access: 'public',
        deprecated: {
          documentationUrl: 'https://elastic.co/',
          severity: 'warning',
          message:
            'This deprecation message will be surfaced in UA. use `i18n.translate` to internationalize this message.',
          reason: { type: 'deprecate' },
        },
      },
    },
    async (ctx, req, res) => {
      return res.ok({
        body: { result: 'Called deprecated route. Check UA to see the deprecation.' },
      });
    }
  );

  router.get(
    {
      path: DEPRECATED_ROUTES.REMOVED_ROUTE,
      validate: false,
      options: {
        access: 'public',
        deprecated: {
          documentationUrl: 'https://elastic.co/',
          severity: 'critical',
          reason: { type: 'remove' },
        },
      },
    },
    async (ctx, req, res) => {
      return res.ok({
        body: { result: 'Called to be removed route. Check UA to see the deprecation.' },
      });
    }
  );

  router.post(
    {
      path: DEPRECATED_ROUTES.MIGRATED_ROUTE,
      validate: {
        body: schema.object({
          test: schema.maybe(schema.boolean()),
        }),
      },
      options: {
        access: 'public',
        deprecated: {
          documentationUrl: 'https://elastic.co/',
          severity: 'critical',
          reason: {
            type: 'migrate',
            newApiMethod: 'GET',
            newApiPath: `${DEPRECATED_ROUTES.VERSIONED_ROUTE}?apiVersion=2`,
          },
        },
      },
    },
    async (ctx, req, res) => {
      return res.ok({
        body: { result: 'Called to be migrated route. Check UA to see the deprecation.' },
      });
    }
  );
};
