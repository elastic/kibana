/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { schema } from '@kbn/config-schema';

export const LayoutsMock = {
  create: vi.fn(),
  configSchema: schema.any(),
};
vi.doMock('../../layouts/layouts', () => {
  const mocked = {
    Layouts: LayoutsMock,
  };
  return { ...mocked, default: mocked };
});

export const createTriggeringPolicyMock = vi.fn();
vi.doMock('./policies', () => {
  const mocked = {
    triggeringPolicyConfigSchema: schema.any(),
    createTriggeringPolicy: createTriggeringPolicyMock,
  };
  return { ...mocked, default: mocked };
});

export const createRollingStrategyMock = vi.fn();
vi.doMock('./strategies', () => {
  const mocked = {
    rollingStrategyConfigSchema: schema.any(),
    createRollingStrategy: createRollingStrategyMock,
  };
  return { ...mocked, default: mocked };
});

export const RollingFileManagerMock = vi.fn();
vi.doMock('./rolling_file_manager', () => {
  const mocked = {
    RollingFileManager: RollingFileManagerMock,
  };
  return { ...mocked, default: mocked };
});

export const RollingFileContextMock = vi.fn();
vi.doMock('./rolling_file_context', () => {
  const mocked = {
    RollingFileContext: RollingFileContextMock,
  };
  return { ...mocked, default: mocked };
});

export const createRetentionPolicyMock = vi.fn();
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
