/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
