/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

export const LayoutsMock = {
  create: jest.fn(),
  configSchema: schema.any(),
};
jest.doMock('../../layouts/layouts', () => ({
  Layouts: LayoutsMock,
}));

export const createTriggeringPolicyMock = jest.fn();
jest.doMock('./policies', () => ({
  triggeringPolicyConfigSchema: schema.any(),
  createTriggeringPolicy: createTriggeringPolicyMock,
}));

export const createRollingStrategyMock = jest.fn();
jest.doMock('./strategies', () => ({
  rollingStrategyConfigSchema: schema.any(),
  createRollingStrategy: createRollingStrategyMock,
}));

export const RollingFileManagerMock = jest.fn();
jest.doMock('./rolling_file_manager', () => ({
  RollingFileManager: RollingFileManagerMock,
}));

export const RollingFileContextMock = jest.fn();
jest.doMock('./rolling_file_context', () => ({
  RollingFileContext: RollingFileContextMock,
}));

export const resetAllMocks = () => {
  LayoutsMock.create.mockReset();
  createTriggeringPolicyMock.mockReset();
  createRollingStrategyMock.mockReset();
  RollingFileManagerMock.mockReset();
  RollingFileContextMock.mockReset();
};
