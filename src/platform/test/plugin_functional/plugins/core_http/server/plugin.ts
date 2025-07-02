/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'stream';
import type { Plugin, CoreSetup } from '@kbn/core/server';

export class CoreHttpPlugin implements Plugin {
  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/core_http/never_reply',
        validate: false,
      },
      async (ctx, req, res) => {
        // need the endpoint to never reply to test request cancelation on the client side.
        await new Promise(() => undefined);
        return res.ok();
      }
    );
    router.get(
      {
        path: '/api/core_http/headers',
        validate: false,
      },
      async (ctx, req, res) => {
        return res.ok({ body: req.headers });
      }
    );

    router.versioned
      .get({
        path: '/api/core_http/public_versioned_route',
        access: 'public',
        enableQueryVersion: false,
      })
      .addVersion({ version: '2023-10-31', validate: false }, (ctx, req, res) => {
        return res.ok({
          body: {
            version: '2023-10-31',
          },
        });
      });

    router.versioned
      .get({
        path: '/api/core_http/internal_versioned_route',
        access: 'internal',
        enableQueryVersion: false,
      })
      .addVersion({ version: '1', validate: false }, (ctx, req, res) => {
        return res.ok({
          body: {
            version: 1,
          },
        });
      })
      .addVersion({ version: '2', validate: false }, (ctx, req, res) => {
        return res.ok({
          body: {
            version: 2,
          },
        });
      });

    router.versioned
      .get({
        path: '/api/core_http/versioned_route_with_query_version',
        access: 'internal',
        enableQueryVersion: true,
      })
      .addVersion({ version: '1', validate: false }, (ctx, req, res) => {
        return res.ok({
          body: {
            version: 1,
          },
        });
      })
      .addVersion({ version: '2', validate: false }, (ctx, req, res) => {
        return res.ok({
          body: {
            version: 2,
          },
        });
      });

    router.get(
      {
        path: '/api/core_http/error_stream',
        validate: false,
      },
      async (ctx, req, res) => {
        return res.customError({
          body: Readable.from(['error stream'], { objectMode: false }),
          statusCode: 501,
        });
      }
    );

    router.get(
      {
        path: '/api/core_http/error_buffer',
        validate: false,
      },
      async (ctx, req, res) => {
        return res.customError({
          body: Buffer.from('error buffer', 'utf8'),
          statusCode: 501,
        });
      }
    );
  }

  public start() {}

  public stop() {}
}
