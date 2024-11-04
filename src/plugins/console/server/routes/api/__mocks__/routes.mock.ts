/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { RequestHandler, RequestHandlerContext } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  deprecationsServiceMock,
} from '@kbn/core/server/mocks';

export const savedObjectsClient = savedObjectsClientMock.create();
export const routeHandlerContextMock = {
  core: {
    elasticsearch: {
      client: elasticsearchServiceMock.createScopedClusterClient(),
    },
    savedObjects: { getClient: () => savedObjectsClient },
    deprecations: { client: deprecationsServiceMock.createClient() },
  },
} as unknown as AwaitedProperties<RequestHandlerContext>;

export const createMockRouter = () => {
  const paths: Record<string, Record<string, RequestHandler<any, any, any>>> = {};

  const assign =
    (method: string) =>
    ({ path }: { path: string }, handler: RequestHandler<any, any, any>) => {
      paths[method] = {
        ...(paths[method] || {}),
        ...{ [path]: handler },
      };
    };

  return {
    getHandler({ method, pathPattern }: { method: string; pathPattern: string }) {
      return paths[method][pathPattern];
    },
    get: assign('get'),
    post: assign('post'),
    put: assign('put'),
    patch: assign('patch'),
    delete: assign('delete'),
  };
};

export type MockRouter = ReturnType<typeof createMockRouter>;
