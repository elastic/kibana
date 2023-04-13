/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hapiMocks } from '@kbn/hapi-mocks';
import { schema } from '@kbn/config-schema';
import type { ApiVersion } from '@kbn/core-http-common';
import type { IRouter, KibanaResponseFactory, RequestHandler } from '@kbn/core-http-server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { createRouter } from './mocks';
import { CoreVersionedRouter } from '.';
import { passThroughValidation } from './core_versioned_route';
import { CoreKibanaRequest } from '../request';

const createRequest = (
  {
    version,
    body,
    params,
    query,
  }: { version: undefined | ApiVersion; body?: object; params?: object; query?: object } = {
    version: '1',
  }
) =>
  CoreKibanaRequest.from(
    hapiMocks.createRequest({
      payload: body,
      params,
      query,
      headers: { [ELASTIC_HTTP_VERSION_HEADER]: version },
      app: { requestId: 'fakeId' },
    }),
    passThroughValidation
  );

describe('Versioned route', () => {
  let router: IRouter;
  let responseFactory: jest.Mocked<KibanaResponseFactory>;
  const handlerFn: RequestHandler = async (ctx, req, res) => res.ok({ body: { foo: 1 } });
  beforeEach(() => {
    responseFactory = {
      custom: jest.fn(({ body, statusCode }) => ({
        options: {},
        status: statusCode,
        payload: body,
      })),
      badRequest: jest.fn(({ body }) => ({ status: 400, payload: body, options: {} })),
      ok: jest.fn(({ body } = {}) => ({
        options: {},
        status: 200,
        payload: body,
      })),
    } as any;
    router = createRouter();
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

  it('only allows versions that are numbers greater than 0', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: 'foo' as ApiVersion, validate: false }, handlerFn)
    ).toThrowError(
      `Invalid version number. Received "foo", expected any finite, whole number greater than 0.`
    );
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '-1', validate: false }, handlerFn)
    ).toThrowError(
      `Invalid version number. Received "-1", expected any finite, whole number greater than 0.`
    );
    expect(() =>
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '1.1', validate: false }, handlerFn)
    ).toThrowError(
      `Invalid version number. Received "1.1", expected any finite, whole number greater than 0.`
    );
  });

  it('runs request and response validations', async () => {
    let handler: RequestHandler;

    let validatedBody = false;
    let validatedParams = false;
    let validatedQuery = false;
    let validatedOutputBody = false;

    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));
    const versionedRouter = CoreVersionedRouter.from({ router, validateResponses: true });
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
            200: {
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
      },
      handlerFn
    );

    const kibanaResponse = await handler!(
      {} as any,
      createRequest({
        version: '1',
        body: { foo: 1 },
        params: { foo: 1 },
        query: { foo: 1 },
      }),
      responseFactory
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
      handler!({} as any, createRequest({ version: '999' }), responseFactory)
    ).resolves.toEqual(
      expect.objectContaining({
        payload:
          'No version "999" available for [post] [/test/{id}]. Available versions are: <none>',
        status: 406,
      })
    );
  });

  it('returns the expected output if no version was provided to versioned route', async () => {
    let handler: RequestHandler;
    const versionedRouter = CoreVersionedRouter.from({ router });
    (router.post as jest.Mock).mockImplementation((opts: unknown, fn) => (handler = fn));

    versionedRouter
      .post({ access: 'internal', path: '/test/{id}' })
      .addVersion({ validate: false, version: '1' }, handlerFn);

    await expect(
      handler!({} as any, createRequest({ version: undefined }), responseFactory)
    ).resolves.toEqual({
      options: {},
      payload: `Version expected at [post] [/test/{id}]. Please specify a version using the "${ELASTIC_HTTP_VERSION_HEADER}" header. Available versions are: [1]`,
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
        createRequest({
          version: '1',
          body: {},
        }),
        responseFactory
      )
    ).resolves.toEqual({
      options: {},
      payload: expect.any(String),
      status: 400,
    });
  });
});
