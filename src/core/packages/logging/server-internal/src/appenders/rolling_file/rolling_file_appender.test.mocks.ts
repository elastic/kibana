/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
import { schema } from '@kbn/config-schema';

export const LayoutsMock = {
  create: vi.fn() as Mock,
  configSchema: schema.any(),
};
vi.doMock('../../layouts/layouts', () => ({
  Layouts: LayoutsMock,
}));

export const createTriggeringPolicyMock: Mock = vi.fn();
vi.doMock('./policies', () => ({
  triggeringPolicyConfigSchema: schema.any(),
  createTriggeringPolicy: createTriggeringPolicyMock,
}));

export const createRollingStrategyMock: Mock = vi.fn();
vi.doMock('./strategies', () => ({
  rollingStrategyConfigSchema: schema.any(),
  createRollingStrategy: createRollingStrategyMock,
}));

export const RollingFileManagerMock: Mock = vi.fn();
vi.doMock('./rolling_file_manager', () => ({
  RollingFileManager: RollingFileManagerMock,
}));

export const RollingFileContextMock: Mock = vi.fn();
vi.doMock('./rolling_file_context', () => ({
  RollingFileContext: RollingFileContextMock,
}));

export const createRetentionPolicyMock: Mock = vi.fn();
vi.doMock('./retention', async () => {
  const actual = await vi.importActual('./retention');
  return {
    ...actual,
    createRetentionPolicy: createRetentionPolicyMock,
  };
});

export const resetAllMocks = () => {
  LayoutsMock.create.mockReset();
  createTriggeringPolicyMock.mockReset();
  createRollingStrategyMock.mockReset();
  createRetentionPolicyMock.mockReset();
  RollingFileManagerMock.mockReset();
  RollingFileContextMock.mockReset();
};
