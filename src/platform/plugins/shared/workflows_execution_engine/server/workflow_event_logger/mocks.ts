/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IWorkflowEventLogger, IWorkflowLogsQueryService } from './types';

jest.mock('./workflow_event_logger', () => ({
  WorkflowEventLogger: jest.fn().mockImplementation(() => createMockWorkflowEventLogger()),
}));

jest.mock('./workflow_event_logger_factory', () => ({
  WorkflowEventLoggerFactory: jest.fn().mockImplementation(() => ({
    createLogger: jest.fn(() => createMockWorkflowEventLogger()),
    createWorkflowLogger: jest.fn(),
    createExecutionLogger: jest.fn(),
    createStepLogger: jest.fn(),
  })),
}));

export const createMockWorkflowEventLogger = (): jest.Mocked<IWorkflowEventLogger> => {
  return {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarn: jest.fn(),
    logDebug: jest.fn(),
    startTiming: jest.fn(),
    stopTiming: jest.fn(),
    createStepLogger: jest.fn(),
  };
};

export const createMockWorkflowEventLoggerService = (): jest.Mocked<IWorkflowLogsQueryService> => {
  return {
    getExecutionLogs: jest.fn(),
    getStepLogs: jest.fn(),
    getLogsByLevel: jest.fn(),
    searchLogs: jest.fn(),
    getRecentLogs: jest.fn(),
  };
};
