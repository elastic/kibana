/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { URL, format as formatUrl } from 'url';
import { Request } from '@hapi/hapi';
import { merge } from 'lodash';
import { Socket } from 'net';
import { stringify } from 'query-string';

import { schema } from '@kbn/config-schema';

import {
  KibanaRequest,
  LifecycleResponseFactory,
  RouteMethod,
  KibanaResponseFactory,
  RouteValidationSpec,
  KibanaRouteOptions,
  KibanaRequestState,
} from './router';
import { OnPreResponseToolkit } from './lifecycle/on_pre_response';
import { OnPostAuthToolkit } from './lifecycle/on_post_auth';
import { OnPreRoutingToolkit } from './lifecycle/on_pre_routing';

interface RequestFixtureOptions<P = any, Q = any, B = any> {
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
  kibanaRouteOptions = { xsrfRequired: true },
  kibanaRequestState = { requestId: '123', requestUuid: '123e4567-e89b-12d3-a456-426614174000' },
  auth = { isAuthenticated: true },
}: RequestFixtureOptions<P, Q, B> = {}) {
  const queryString = stringify(query, { sort: false });
  const url = new URL(`${path}${queryString ? `?${queryString}` : ''}`, 'http://localhost');

  return KibanaRequest.from<P, Q, B>(
    createRawRequestMock({
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

type DeepPartial<T> = T extends any[]
  ? DeepPartialArray<T[number]>
  : T extends object
  ? DeepPartialObject<T>
  : T;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DeepPartialArray<T> extends Array<DeepPartial<T>> {}

type DeepPartialObject<T> = { [P in keyof T]+?: DeepPartial<T[P]> };

function createRawRequestMock(customization: DeepPartial<Request> = {}) {
  const pathname = customization.url?.pathname || '/';
  const path = `${pathname}${customization.url?.search || ''}`;
  const url = new URL(
    formatUrl(Object.assign({ pathname, path, href: path }, customization.url)),
    'http://localhost'
  );

  return merge(
    {},
    {
      app: { xsrfRequired: true } as any,
      auth: {
        isAuthenticated: true,
      },
      headers: {},
      path,
      route: { settings: {} },
      url,
      raw: {
        req: {
          url: path,
          socket: {},
        },
      },
    },
    customization
  ) as Request;
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
  internalError: jest.fn(),
  customError: jest.fn(),
});

const createLifecycleResponseFactoryMock = (): jest.Mocked<LifecycleResponseFactory> => ({
  redirected: jest.fn(),
  badRequest: jest.fn(),
  unauthorized: jest.fn(),
  forbidden: jest.fn(),
  notFound: jest.fn(),
  conflict: jest.fn(),
  internalError: jest.fn(),
  customError: jest.fn(),
});

type ToolkitMock = jest.Mocked<OnPreResponseToolkit & OnPostAuthToolkit & OnPreRoutingToolkit>;

const createToolkitMock = (): ToolkitMock => {
  return {
    render: jest.fn(),
    next: jest.fn(),
    rewriteUrl: jest.fn(),
  };
};

export const httpServerMock = {
  createKibanaRequest: createKibanaRequestMock,
  createRawRequest: createRawRequestMock,
  createResponseFactory: createResponseFactoryMock,
  createLifecycleResponseFactory: createLifecycleResponseFactoryMock,
  createToolkit: createToolkitMock,
};
