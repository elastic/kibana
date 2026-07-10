/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const mockExecutionsDalInitSetup = jest.fn().mockResolvedValue(undefined);
export const mockExecutionsDalInitStart = jest.fn().mockResolvedValue(undefined);

export const createExecutionsDalJestMock = () => {
  const { createMockStepExecutionsDal, createMockWorkflowExecutionsDal } = jest.requireActual(
    '@kbn/workflows/server/data_access_layer'
  );

  return {
    initSetup: mockExecutionsDalInitSetup,
    initStart: mockExecutionsDalInitStart,
    createWorkflowExecutionsDal: jest.fn(async () => createMockWorkflowExecutionsDal()),
    createStepExecutionsDal: jest.fn(async () => createMockStepExecutionsDal()),
  };
};
