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

import { OnPreResponseToolkit } from './on_pre_response';
import { OnPostAuthToolkit } from './on_post_auth';
import { OnPreAuthToolkit } from './on_pre_auth';
import { LifecycleResponseFactory } from '../router';

type MockToolkit = jest.Mocked<OnPreResponseToolkit & OnPostAuthToolkit & OnPreAuthToolkit>;
type MockLifecycleResponseFactory = jest.Mocked<LifecycleResponseFactory>;

const createMockToolkit = (): MockToolkit => {
  return {
    next: jest.fn(),
    rewriteUrl: jest.fn(),
  };
};

const createMockLifecycleResponseFactory = (): MockLifecycleResponseFactory => {
  return {
    redirected: jest.fn(),
    badRequest: jest.fn(),
    unauthorized: jest.fn(),
    forbidden: jest.fn(),
    notFound: jest.fn(),
    conflict: jest.fn(),
    internalError: jest.fn(),
    customError: jest.fn(),
  };
};

export const lifecycleMock = {
  createToolkit: createMockToolkit,
  createLifecycleResponseFactory: createMockLifecycleResponseFactory,
};
