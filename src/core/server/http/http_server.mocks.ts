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
  createRawRequest: createRawRequestMock,
  createRawResponseToolkit: createRawResponseToolkitMock,
};
