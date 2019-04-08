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
import { Server, ServerOptions } from 'hapi';
import { HttpService } from './http_service';

const createStartContractMock = () => {
  const startContract = {
    // we can mock some hapi server method when we need it
    server: {} as Server,
    options: {} as ServerOptions,
  };
  return startContract;
};

type MethodKeysOf<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never
}[keyof T];

type PublicMethodsOf<T> = Pick<T, MethodKeysOf<T>>;

type HttpSericeContract = PublicMethodsOf<HttpService>;
const createHttpServiceMock = () => {
  const mocked: jest.Mocked<HttpSericeContract> = {
    start: jest.fn(),
    stop: jest.fn(),
    registerRouter: jest.fn(),
  };
  mocked.start.mockResolvedValue(createStartContractMock());
  return mocked;
};

export const httpServiceMock = {
  create: createHttpServiceMock,
  createStartContract: createStartContractMock,
};
