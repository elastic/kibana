/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URL } from 'url';
import { Socket } from 'net';
import { stringify } from 'query-string';
import type { FastifyReply } from 'fastify';
import { fastifyMocks } from '@kbn/hapi-mocks'; // TODO: Rename package to `@kbn/fastify-mocks
// import { schema } from '@kbn/config-schema';
import type {
  IRouter,
  KibanaRequest,
  RouteMethod,
  RouteValidationSpec,
  KibanaRouteOptions,
  KibanaRequestState,
  KibanaResponseFactory,
} from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';

export type RouterMock = jest.Mocked<IRouter<any>>;

function createRouterMock({ routerPath = '' }: { routerPath?: string } = {}): RouterMock {
  return {
    routerPath,
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    getRoutes: jest.fn(),
    handleLegacyErrors: jest.fn().mockImplementation((handler) => handler),
  };
}

/**
 * @internal
 */
export interface RequestFixtureOptions<P = any, Q = any, B = any> {
  auth?: { isAuthenticated: boolean };
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: Record<string, any>;
  query?: Record<string, any>;
  path?: string;
  method?: RouteMethod;
  socket?: Socket;
  routeTags?: string[];
  id?: string;
  kibanaRouteOptions?: KibanaRouteOptions;
  kibanaRequestState?: KibanaRequestState;
  routeAuthRequired?: false;
  validation?: {
    params?: RouteValidationSpec<P>;
    query?: RouteValidationSpec<Q>;
    body?: RouteValidationSpec<B>;
  };
}

function createKibanaRequestMock<P = any, Q = any, B = any>({
  path = '/path',
  headers = { accept: 'something/html' },
  params = {},
  body = {},
  query = {},
  method = 'get',
  socket = new Socket(),
  id = '123e4567-e89b-12d3-a456-426614174000',
  routeTags,
  routeAuthRequired,
  validation = {},
  kibanaRouteOptions = { xsrfRequired: true },
  kibanaRequestState = {
    requestId: '123',
  },
  auth = { isAuthenticated: true },
}: RequestFixtureOptions<P, Q, B> = {}): KibanaRequest<P, Q, B> {
  const queryString = stringify(query, { sort: false });
  const url = new URL(`${path}${queryString ? `?${queryString}` : ''}`, 'http://localhost')
    .pathname;

  return CoreKibanaRequest.from<P, Q, B>(
    fastifyMocks.createRequest({
      context: {
        config: {
          // TODO: Not sure about these properties
          ...kibanaRequestState,
          ...kibanaRouteOptions,
          auth: routeAuthRequired,
          tags: routeTags,
        },
      },
      id,
      headers,
      params,
      query,
      body,
      method,
      url,
      socket,
      raw: {
        // these are needed to avoid an error when consuming KibanaRequest.events
        on: jest.fn(),
        off: jest.fn(),
      },
    }),
    {
      // TODO: How do we make a proper mock reply?
      // params: validation.params || schema.any(),
      // body: validation.body || schema.any(),
      // query: validation.query || schema.any(),
    } as FastifyReply
  );
}

const createResponseFactoryMock = (): jest.Mocked<KibanaResponseFactory> => ({
  ok: jest.fn(),
  accepted: jest.fn(),
  noContent: jest.fn(),
  custom: jest.fn(),
  redirected: jest.fn(),
  badRequest: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  conflict: jest.fn(),
  customError: jest.fn(),
});

export const mockRouter = {
  create: createRouterMock,
  createKibanaRequest: createKibanaRequestMock,
  createResponseFactory: createResponseFactoryMock,
};
