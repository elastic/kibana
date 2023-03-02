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
import { hapiMocks } from '@kbn/hapi-mocks';
import { schema } from '@kbn/config-schema';
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
  routeTags,
  routeAuthRequired,
  validation = {},
  kibanaRouteOptions = { xsrfRequired: true, access: 'public' },
  kibanaRequestState = {
    requestId: '123',
    requestUuid: '123e4567-e89b-12d3-a456-426614174000',
  },
  auth = { isAuthenticated: true },
}: RequestFixtureOptions<P, Q, B> = {}): KibanaRequest<P, Q, B> {
  const queryString = stringify(query, { sort: false });
  const url = new URL(`${path}${queryString ? `?${queryString}` : ''}`, 'http://localhost');

  return CoreKibanaRequest.from<P, Q, B>(
    hapiMocks.createRequest({
      app: kibanaRequestState,
      auth,
      headers,
      params,
      query,
      payload: body,
      path,
      method,
      url,
      route: {
        // @ts-expect-error According to types/hapi__hapi the following settings-fields have problems:
        // - `auth` can't be a boolean, but it can according to the @hapi/hapi source (https://github.com/hapijs/hapi/blob/v18.4.2/lib/route.js#L139)
        // - `app` isn't a valid property, but it is and this was fixed in the types in v19.0.1 (https://github.com/DefinitelyTyped/DefinitelyTyped/pull/41968)
        settings: { tags: routeTags, auth: routeAuthRequired, app: kibanaRouteOptions },
      },
      raw: {
        req: {
          socket,
          // these are needed to avoid an error when consuming KibanaRequest.events
          on: jest.fn(),
          off: jest.fn(),
        },
      },
    }),
    {
      params: validation.params || schema.any(),
      body: validation.body || schema.any(),
      query: validation.query || schema.any(),
    }
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
  file: jest.fn(),
});

export const mockRouter = {
  create: createRouterMock,
  createKibanaRequest: createKibanaRequestMock,
  createResponseFactory: createResponseFactoryMock,
};
