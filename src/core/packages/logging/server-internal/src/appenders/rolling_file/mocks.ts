/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mocked } from 'vitest';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Layout } from '@kbn/logging';
import type { RollingFileContext } from './rolling_file_context';
import type { RollingFileManager } from './rolling_file_manager';
import type { TriggeringPolicy } from './policies/policy';
import type { RollingStrategy } from './strategies/strategy';
import type { RetentionPolicy } from './retention/retention_policy';

const createContextMock = (filePath: string = 'kibana.log') => {
  const mock: Mocked<RollingFileContext> = {
    currentFileSize: 0,
    currentFileTime: 0,
    filePath,
    refreshFileInfo: vi.fn(),
    getOrderedRolledFiles: vi.fn(),
    setOrderedRolledFileFn: vi.fn(),
  };
  return mock;
};

const createStrategyMock = () => {
  const mock: Mocked<RollingStrategy> = {
    rollout: vi.fn(),
  };
  return mock;
};

const createPolicyMock = () => {
  const mock: Mocked<TriggeringPolicy> = {
    isTriggeringEvent: vi.fn(),
  };
  return mock;
};

const createLayoutMock = () => {
  const mock: Mocked<Layout> = {
    format: vi.fn(),
  };
  return mock;
};

const createFileManagerMock = () => {
  const mock: Mocked<PublicMethodsOf<RollingFileManager>> = {
    write: vi.fn(),
    closeStream: vi.fn(),
  };
  return mock;
};

const createRetentionPolicyMock = () => {
  const mock: Mocked<RetentionPolicy> = {
    apply: vi.fn(),
  };
  return mock;
};

export const rollingFileAppenderMocks = {
  createContext: createContextMock,
  createStrategy: createStrategyMock,
  createPolicy: createPolicyMock,
  createLayout: createLayoutMock,
  createFileManager: createFileManagerMock,
  createRetentionPolicy: createRetentionPolicyMock,
};
