/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core-http-server';
import { httpServiceMock, httpServerMock } from '@kbn/core-http-server-mocks';
import { VERSION_HEADER } from './core_versioned_route';
import { CoreVersionedRouter } from '.';
import { kibanaResponseFactory } from '@kbn/core-http-router-server-internal';

describe('Versioned route', () => {
  let router: IRouter;
  const handlerFn: RequestHandler = async (ctx, req, res) => res.ok({ body: { foo: 1 } });
  beforeEach(() => {
    router = httpServiceMock.createRouter();
  });

  it('can register multiple handlers', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    versionedRouter
      .get({ path: '/test/{id}', access: 'internal' })
      .addVersion({ version: '1', validate: false }, handlerFn)
      .addVersion({ version: '2', validate: false }, handlerFn)
      .addVersion({ version: '3', validate: false }, handlerFn);
    const routes = versionedRouter.getRoutes();
    expect(routes).toHaveLength(1);
    const [route] = routes;
    expect(route.handlers).toHaveLength(3);
    // We only register one route with the underlying router
    expect(router.get).toHaveBeenCalledTimes(1);
  });

  it('does not allow specifying a handler for the same version more than once', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '3', validate: false }, handlerFn)
    ).toThrowError(
      `Version "1" handler has already been registered for the route [get] [/test/{id}]`
    );
  });

  it('runs request and response validations', async () => {
    let handler: RequestHandler;

    let validatedBody = false;
    let validatedParams = false;
    let validatedQuery = false;
    let validatedOutputBody = false;

    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
    const versionedRouter = CoreVersionedRouter.from({ router });
    versionedRouter.post({ path: '/test/{id}', access: 'internal' }).addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              foo: schema.number({
                validate: () => {
                  validatedBody = true;
                },
              }),
            }),
            params: schema.object({
              foo: schema.number({
                validate: () => {
                  validatedParams = true;
                },
              }),
            }),
            query: schema.object({
              foo: schema.number({
                validate: () => {
                  validatedQuery = true;
                },
              }),
            }),
          },
          response: {
            body: schema.object({
              foo: schema.number({
                validate: () => {
                  validatedOutputBody = true;
                },
              }),
            }),
          },
        },
      },
      handlerFn
    );

    const kibanaResponse = await handler!(
      {} as any,
      httpServerMock.createKibanaRequest({
        headers: { [VERSION_HEADER]: '1' },
        body: { foo: 1 },
        params: { foo: 1 },
        query: { foo: 1 },
      }),
      kibanaResponseFactory
    );

    expect(kibanaResponse.status).toBe(200);
    expect(validatedBody).toBe(true);
    expect(validatedParams).toBe(true);
    expect(validatedQuery).toBe(true);
    expect(validatedOutputBody).toBe(true);
  });

  it('returns the expected output for non-existent versions', async () => {
    let handler: RequestHandler;
    const versionedRouter = CoreVersionedRouter.from({ router });
    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
    versionedRouter.post({ access: 'internal', path: '/test/{id}' });

    await expect(
      handler!(
        {} as any,
        httpServerMock.createKibanaRequest({
          headers: { [VERSION_HEADER]: '999' },
        }),
        kibanaResponseFactory
      )
    ).resolves.toEqual({
      options: {},
      payload: 'No version "999" available for [post] [/test/{id}]. Available versions are: "none"',
      status: 406,
    });
  });

  it('returns the expected output if no version was provided to versioned route', async () => {
    let handler: RequestHandler;
    const versionedRouter = CoreVersionedRouter.from({ router });
    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));

    versionedRouter
      .post({ access: 'internal', path: '/test/{id}' })
      .addVersion({ validate: false, version: '1' }, handlerFn);

    await expect(
      handler!(
        {} as any,
        httpServerMock.createKibanaRequest({
          headers: {},
        }),
        kibanaResponseFactory
      )
    ).resolves.toEqual({
      options: {},
      payload:
        'Version expected at [post] [/test/{id}]. Please specify a version using the "TBD" header. Available versions are: "1"',
      status: 406,
    });
  });
  it('returns the expected output for failed validation', async () => {
    let handler: RequestHandler;
    const versionedRouter = CoreVersionedRouter.from({ router });
    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));

    versionedRouter
      .post({ access: 'internal', path: '/test/{id}' })
      .addVersion(
        { validate: { request: { body: schema.object({ foo: schema.number() }) } }, version: '1' },
        handlerFn
      );

    await expect(
      handler!(
        {} as any,
        httpServerMock.createKibanaRequest({
          headers: { [VERSION_HEADER]: '1' },
          body: {},
        }),
        kibanaResponseFactory
      )
    ).resolves.toEqual({
      options: {},
      payload: expect.any(String),
      status: 400,
    });
  });
});
