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

import { HttpService } from './http_service';
import { HttpSetup } from './types';
import { BehaviorSubject } from 'rxjs';
import { BasePath } from './base_path_service';
import { AnonymousPaths } from './anonymous_paths';

export type HttpSetupMock = jest.Mocked<HttpSetup> & {
  basePath: BasePath;
};

const createServiceMock = ({ basePath = '' } = {}): HttpSetupMock => ({
  fetch: jest.fn(),
  get: jest.fn(),
  head: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  options: jest.fn(),
  basePath: new BasePath(basePath),
  anonymousPaths: new AnonymousPaths(new BasePath(basePath)),
  addLoadingCount: jest.fn(),
  getLoadingCount$: jest.fn().mockReturnValue(new BehaviorSubject(0)),
  stop: jest.fn(),
  intercept: jest.fn(),
  removeAllInterceptors: jest.fn(),
});

const createMock = ({ basePath = '' } = {}) => {
  const mocked: jest.Mocked<Required<HttpService>> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockReturnValue(createServiceMock({ basePath }));
  mocked.start.mockReturnValue(createServiceMock({ basePath }));
  return mocked;
};

export const httpServiceMock = {
  create: createMock,
  createSetupContract: createServiceMock,
  createStartContract: createServiceMock,
};
