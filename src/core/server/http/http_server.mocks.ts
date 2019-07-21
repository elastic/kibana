/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { merge } from 'lodash';

import querystring from 'querystring';

import { schema } from '@kbn/config-schema';

import { KibanaRequest, RouteMethod } from './router';

interface RequestFixtureOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  path?: string;
  method?: RouteMethod;
}

function createKibanaRequestMock({
  path = '/path',
  headers = { accept: 'something/html' },
  params = {},
  body = {},
  query = {},
  method = 'get',
}: RequestFixtureOptions = {}) {
  const queryString = querystring.stringify(query);
  return KibanaRequest.from(
    {
      headers,
      params,
      query,
      payload: body,
      path,
      method,
      url: {
        path,
        query: queryString,
        search: queryString ? `?${queryString}` : queryString,
      },
      route: { settings: {} },
      raw: {
        req: {},
      },
    } as any,
    {
      params: schema.object({}, { allowUnknowns: true }),
      body: schema.object({}, { allowUnknowns: true }),
      query: schema.object({}, { allowUnknowns: true }),
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
  return merge(
    {},
    {
      headers: {},
      path: '/',
      route: { settings: {} },
      raw: {
        req: {
          url: '/',
        },
      },
    },
    customization
  ) as Request;
}

function createRawResponseToolkitMock(customization: DeepPartial<ResponseToolkit> = {}) {
  return merge({}, customization) as ResponseToolkit;
}

export const httpServerMock = {
  createKibanaRequest: createKibanaRequestMock,
  createRawRequest: createRawRequestMock,
  createRawResponseToolkit: createRawResponseToolkitMock,
};
