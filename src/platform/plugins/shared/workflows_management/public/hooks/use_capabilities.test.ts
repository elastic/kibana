/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { useCapabilities } from './use_capabilities';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsCapabilities: jest.fn(),
}));
const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

describe('useCapabilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({
      workflowUIEnabled: true,
      canCreateWorkflow: false,
      canReadWorkflow: false,
      canUpdateWorkflow: false,
      canDeleteWorkflow: false,
      canExecuteWorkflow: false,
      canReadWorkflowExecution: false,
      canCancelWorkflowExecution: false,
    });
  });

  it('returns workflow capabilities without the uiSettings flag', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      workflowUIEnabled: true,
      canCreateWorkflow: true,
      canReadWorkflow: false,
      canUpdateWorkflow: true,
      canDeleteWorkflow: false,
      canExecuteWorkflow: true,
      canReadWorkflowExecution: false,
      canCancelWorkflowExecution: true,
    });

    const { result } = renderHook(useCapabilities);

    expect(result.current).toEqual({
      canCreateWorkflow: true,
      canReadWorkflow: false,
      canUpdateWorkflow: true,
      canDeleteWorkflow: false,
      canExecuteWorkflow: true,
      canReadWorkflowExecution: false,
      canCancelWorkflowExecution: true,
    });
  });
});
