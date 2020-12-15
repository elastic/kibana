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

import { PublicMethodsOf } from '@kbn/utility-types';
import type { Layout } from '@kbn/logging';
import type { RollingFileContext } from './rolling_file_context';
import type { RollingFileManager } from './rolling_file_manager';
import type { TriggeringPolicy } from './policies/policy';
import type { RollingStrategy } from './strategies/strategy';

const createContextMock = (filePath: string) => {
  const mock: jest.Mocked<RollingFileContext> = {
    currentFileSize: 0,
    currentFileTime: 0,
    filePath,
    refreshFileInfo: jest.fn(),
  };
  return mock;
};

const createStrategyMock = () => {
  const mock: jest.Mocked<RollingStrategy> = {
    rollout: jest.fn(),
  };
  return mock;
};

const createPolicyMock = () => {
  const mock: jest.Mocked<TriggeringPolicy> = {
    isTriggeringEvent: jest.fn(),
  };
  return mock;
};

const createLayoutMock = () => {
  const mock: jest.Mocked<Layout> = {
    format: jest.fn(),
  };
  return mock;
};

const createFileManagerMock = () => {
  const mock: jest.Mocked<PublicMethodsOf<RollingFileManager>> = {
    write: jest.fn(),
    closeStream: jest.fn(),
  };
  return mock;
};

export const rollingFileAppenderMocks = {
  createContext: createContextMock,
  createStrategy: createStrategyMock,
  createPolicy: createPolicyMock,
  createLayout: createLayoutMock,
  createFileManager: createFileManagerMock,
};
