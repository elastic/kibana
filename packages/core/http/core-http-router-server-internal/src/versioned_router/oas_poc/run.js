/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-console,@kbn/imports/no_boundary_crossing,import/no-extraneous-dependencies  */

require('../../../../../../../src/setup_node_env');

const { Router } = require('../../router');
const { CoreVersionedRouter } = require('../core_versioned_router');
const { generateOpenApiDocument } = require('./generate_oas');
const z = require('zod');

const logger = {
  debug: console.log,
  error: console.log,
  fatal: console.log,
  info: console.log,
  log: console.log,
  trace: console.log,
  warn: console.log,
  isLevelEnabled: () => true,
  get: () => logger,
};

const router = CoreVersionedRouter.from({
  router: new Router('', logger, {}),
});
router
  .get({
    access: 'public',
    path: '/api/cool/endpoint/{id}',
  })
  .addVersion(
    {
      version: '2023-01-01',
      description: 'My cool route',
      validate: {
        request: {
          params: z.object({ id: z.string() }),
        },
        response: {
          200: {
            body: z.object({ foo: z.string().max(5) }),
          },
          400: {
            body: z.object({ error: z.string() }),
          },
        },
      },
    },
    (ctx, req, res) => res.ok()
  )
  // BREAKING CHANGE foo => bar in response
  .addVersion(
    {
      version: '2023-03-01',
      validate: {
        request: {
          params: z.object({ id: z.string() }),
        },
        response: {
          200: {
            params: z.object({ id: z.string() }),
            body: z.object({ bar: z.string().max(5) }),
          },
          400: {
            body: z.object({ error: z.string() }),
          },
        },
      },
    },
    (ctx, req, res) => res.ok()
  );

router
  .post({
    access: 'public',
    path: '/api/cool/endpoint/{id}',
  })
  .addVersion(
    {
      version: '2023-01-01',
      validate: {
        request: {
          params: z.object({ id: z.string() }),
          body: z.object({ foo: z.string(5) }),
        },
        response: {
          200: {
            body: z.object({ id: z.string().max(24) }),
          },
        },
      },
    },
    (ctx, req, res) => res.ok()
  )
  .addVersion(
    {
      version: '2023-03-01',
      validate: {
        request: {
          params: z.object({ id: z.string() }),
          body: z.object({ bar: z.string(5) }),
        },
        response: {
          200: {
            body: z.object({ id: z.string().max(24) }),
          },
        },
      },
    },
    (ctx, req, res) => res.ok()
  );

console.log(
  JSON.stringify(
    generateOpenApiDocument(router, {
      title: 'PoC',
      version: '1.0.0',
      baseUrl: 'http://localhost:5601',
    }),
    null,
    2
  )
);
