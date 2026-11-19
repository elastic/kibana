/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowManagementAuditLog } from './workflow_audit_logging';
import type { WorkflowsService } from '../../workflows_management_service';

const mockWorkflowsService = {
  getCoreStart: jest.fn().mockResolvedValue({
    security: {
      audit: {
        asScoped: jest.fn(),
        withoutRequest: jest.fn(),
      },
      authc: {
        getCurrentUser: jest.fn(),
      },
    },
  }),
} as unknown as WorkflowsService;

export const createWorkflowManagementAuditLogMock = () => {
  return new WorkflowManagementAuditLog({ service: mockWorkflowsService });
};
