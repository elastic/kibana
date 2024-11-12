/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { DEPRECATED_ROUTES } from '../../../common';

export const registerInternalDeprecatedRoute = (router: IRouter) => {
  router.get(
    {
      path: DEPRECATED_ROUTES.INTERNAL_DEPRECATED_ROUTE,
      validate: false,
      options: {
        // Explicitly set access is to internal
        access: 'internal',
        deprecated: {
          documentationUrl: 'https://elastic.co/',
          severity: 'critical',
          message: 'Additonal message for internal deprecated api',
          reason: { type: 'deprecate' },
        },
      },
    },
    async (ctx, req, res) => {
      return res.ok({
        body: {
          result:
            'Called deprecated route with `access: internal`. Check UA to see the deprecation.',
        },
      });
    }
  );

  router.get(
    {
      path: DEPRECATED_ROUTES.INTERNAL_ONLY_ROUTE,
      validate: false,
      // If no access is specified then it defaults to internal
    },
    async (ctx, req, res) => {
      return res.ok({
        body: {
          result:
            'Called route with `access: internal` Although this API is not marked as deprecated it will show in UA. Check UA to see the deprecation.',
        },
      });
    }
  );
};
