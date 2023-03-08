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
    path: '/api/my-app/foo/{id?}',
    options: { timeout: { payload: 60000 }, access: 'public' },
  })
  .addVersion(
    {
      version: '1',
      validate: {
        query: schema.object({
          name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
        }),
        params: schema.object({
          id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
        }),
        body: schema.object({ foo: schema.string() }),
      },
    },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.foo, req.params.id, req.query.name);
      return res.ok({ body: { foo: req.body.foo } });
    }
  )
  // BREAKING CHANGE: { foo: string } => { fooString: string } in body
  .addVersion(
    {
      version: '2',
      validate: {
        query: schema.object({
          name: schema.maybe(schema.string({ minLength: 2, maxLength: 50 })),
        }),
        params: schema.object({
          id: schema.maybe(schema.string({ minLength: 10, maxLength: 13 })),
        }),
        body: schema.object({ fooString: schema.string() }),
      },
    },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.fooString, req.params.id, req.query.name);
      return res.ok({ body: { fooName: req.body.fooString } });
    }
  )
  // BREAKING CHANGES: Enforce min/max length on fooString
  .addVersion(
    {
      version: '3',
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
