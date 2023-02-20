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
  fooService: { create: (value: string) => Promise<void> };
}
const vtk = {} as unknown as VersionHTTPToolkit;
const router = {} as unknown as IRouter<MyCustomContext>;

const versionedRouter = vtk.createVersionedRouter({ router });

// @ts-ignore unused variable
const versionedRoute = versionedRouter
  .post({
    path: '/api/my-app/foo',
    options: { timeout: { payload: 60000 } },
  })
  // First version of the API, accepts { foo: string } in the body
  .addVersion(
    { version: '1', validate: { body: schema.object({ foo: schema.string() }) } },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.foo);
      return res.ok({ body: { foo: req.body.foo } });
    }
  )
  // Second version of the API, accepts { fooName: string } in the body
  .addVersion(
    { version: '2', validate: { body: schema.object({ fooName: schema.string() }) } },
    async (ctx, req, res) => {
      await ctx.fooService.create(req.body.fooName);
      return res.ok({ body: { fooName: req.body.fooName } });
    }
  );
