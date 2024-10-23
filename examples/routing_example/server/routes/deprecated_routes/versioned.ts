/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandler } from '@kbn/core-http-server';
import type { IRouter } from '@kbn/core/server';
import { DEPRECATED_ROUTES } from '../../../common';

const createDummyHandler =
  (version: string): RequestHandler =>
  (ctx, req, res) => {
    return res.ok({ body: { result: `API version ${version}.` } });
  };

export const registerVersionedDeprecatedRoute = (router: IRouter) => {
  const versionedRoute = router.versioned.get({
    path: DEPRECATED_ROUTES.VERSIONED_ROUTE,
    description: 'Routing example plugin deprecated versioned route.',
    access: 'internal',
    options: {
      excludeFromOAS: true,
    },
    enableQueryVersion: true,
  });

  versionedRoute.addVersion(
    {
      options: {
        deprecated: {
          documentationUrl: 'https://elastic.co/',
          severity: 'warning',
          reason: { type: 'bump', newApiVersion: '2' },
        },
      },
      validate: false,
      version: '1',
    },
    createDummyHandler('1')
  );

  versionedRoute.addVersion(
    {
      version: '2',
      validate: false,
    },
    createDummyHandler('2')
  );
};
