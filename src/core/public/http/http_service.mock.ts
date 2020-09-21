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
import type { PublicMethodsOf } from '@kbn/utility-types';
import { HttpService } from './http_service';
import { HttpSetup, HttpStart } from './types';
import { BehaviorSubject } from 'rxjs';
import { BasePath } from './base_path';

export type HttpSetupMock = jest.Mocked<HttpSetup> & {
  basePath: BasePath;
  anonymousPaths: jest.Mocked<HttpSetup['anonymousPaths']>;
};

export type HttpStartMock = jest.Mocked<HttpStart> & {
  basePath: BasePath;
  anonymousPaths: jest.Mocked<HttpStart['anonymousPaths']>;
};

const createSetupMock = ({ basePath = '' } = {}): HttpSetupMock => ({
  fetch: jest.fn(),
  get: jest.fn(),
  head: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  options: jest.fn(),
  basePath: new BasePath(basePath),
  anonymousPaths: {
    register: jest.fn(),
  },
  addLoadingCountSource: jest.fn(),
  getLoadingCount$: jest.fn().mockReturnValue(new BehaviorSubject(0)),
  intercept: jest.fn(),
});

const createStartMock = ({ basePath = '' } = {}): HttpStartMock => ({
  ...createSetupMock({ basePath }),
  anonymousPaths: {
    isAnonymous: jest.fn(),
  },
});

const createMock = ({ basePath = '' } = {}) => {
  const mocked: jest.Mocked<PublicMethodsOf<HttpService>> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockReturnValue(createSetupMock({ basePath }));
  mocked.start.mockReturnValue(createStartMock({ basePath }));
  return mocked;
};

export const httpServiceMock = {
  create: createMock,
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
};
