/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  WorkflowsExecutionEnginePluginSetup,
  WorkflowsExecutionEnginePluginStart,
} from './types';
import { createMockWorkflowEventLoggerService } from './workflow_event_logger/mocks';

export const workflowsExecutionEngineMock = {
  createSetup: jest.fn().mockReturnValue({} as jest.Mocked<WorkflowsExecutionEnginePluginSetup>),
  createStart: jest.fn().mockReturnValue({
    workflowEventLoggerService: createMockWorkflowEventLoggerService(),
    executeWorkflow: jest.fn(),
    executeWorkflowStep: jest.fn(),
    cancelWorkflowExecution: jest.fn(),
    scheduleWorkflow: jest.fn(),
  } as jest.Mocked<WorkflowsExecutionEnginePluginStart>),
};
