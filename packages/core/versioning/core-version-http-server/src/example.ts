/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { VersionHTTPToolkit } from './version_http_toolkit';

interface MyCustomContext extends RequestHandlerContextBase {
  fooService: { create: (value: string, id: undefined | string, name?: string) => Promise<void> };
}
const vtk = {} as unknown as VersionHTTPToolkit;
const router = {} as unknown as IRouter<MyCustomContext>;

const versionedRouter = vtk.createVersionedRouter({ router });

// @ts-ignore unused variable
const versionedRoute = versionedRouter
  .post({
    path: '/api/my-app/foo/{fooId?}/{name?}', // <= design mistake, {name?} should be a query parameter, but it has been released...
    options: { timeout: { payload: 60000 } },
  })
  .addVersion(
    {
      version: '1',
      validate: {
        params: schema.object({
          fooId: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
          name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
        }),
        body: schema.object({ foo: schema.string() }),
      },
    },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.foo, req.params.fooId, req.params.name);
      return res.ok({ body: { foo: req.body.foo } });
    }
  )
  // BREAKING CHANGE: { foo: string } => { fooString: string } in body
  .addVersion(
    {
      version: '2',
      path: '/api/my-app/foo/{id?}/{name?}', // Update "fooId" => "id", this is not a breaking change!
      validate: {
        params: schema.object({
          id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
          name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
        }),
        body: schema.object({ fooString: schema.string() }),
      },
    },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.fooString, req.params.id, req.params.name);
      return res.ok({ body: { fooName: req.body.fooString } });
    }
  )
  // BREAKING CHANGES:
  // 1. Move {name?} from params to query (hopefully an uncommon change)
  // 2. Enforce min/max length on fooString
  .addVersion(
    {
      version: '3',
      path: '/api/my-app/foo/{id?}', // Breaking change to the path, we move "name" to the query
      validate: {
        query: schema.object({
          name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
        }),
        params: schema.object({
          id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
        }),
        body: schema.object({ fooString: schema.string({ minLength: 0, maxLength: 1000 }) }),
      },
    },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.fooString, req.params.id, req.query.name);
      return res.ok({ body: { fooName: req.body.fooString } });
    }
  );
