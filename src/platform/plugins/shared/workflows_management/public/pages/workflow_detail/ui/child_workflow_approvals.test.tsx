/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ChildWorkflowApprovals } from './child_workflow_approvals';
import { createMockWorkflowDetailDto } from '../../../shared/test_utils/mock_workflow_factories';

const mockHttp = { get: jest.fn(), post: jest.fn() };
const mockEnabled = jest.fn();
const mockQuery = {
  data: {
    reviewToken: 'reviewed-token',
    canApprove: true,
    serviceAccountId: 'sa',
    children: [
      {
        path: ['child'],
        workflowId: 'child',
        name: 'Child',
        currentVersion: 2,
        approvedVersion: 1,
        currentYaml: 'new code',
        approvedYaml: 'approved code',
        status: 'changed',
      },
    ],
  },
  refetch: jest.fn(),
  isFetching: false,
  isError: false,
};
jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { http: mockHttp, security: { serviceAccounts: { isEnabled: mockEnabled } } },
  }),
}));
jest.mock('@kbn/react-query', () => ({ useQuery: () => mockQuery }));
jest.mock('../../../features/change_history/workflow_change_history_monaco_preview', () => ({
  WorkflowChangeHistoryMonacoPreview: ({
    baselineYaml,
    targetYaml,
  }: {
    baselineYaml: string;
    targetYaml: string;
  }) => (
    <div>
      {baselineYaml}
      {' → '}
      {targetYaml}
    </div>
  ),
}));
const workflow = createMockWorkflowDetailDto({
  definition: {
    name: 'Parent',
    version: '1',
    enabled: true,
    settings: { run_as: 'sa' },
    triggers: [{ type: 'manual' }],
    steps: [
      {
        name: 'child',
        type: 'workflow.execute',
        with: { 'workflow-id': 'child', inheritRunAs: true },
      },
    ],
  },
});
const mount = (hasUnsavedChanges = false) =>
  render(
    <EuiProvider>
      <ChildWorkflowApprovals workflow={workflow} hasUnsavedChanges={hasUnsavedChanges} />
    </EuiProvider>
  );

describe('child approval review', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnabled.mockReturnValue(true);
    mockQuery.data.canApprove = true;
    mockHttp.post.mockResolvedValue({ approved: true });
  });
  it('shows the approved-to-current diff and approves only the reviewed token', async () => {
    mount();
    await userEvent.click(screen.getByTestId('reviewChildWorkflowApprovals'));
    expect(screen.getByText('approved code → new code')).toBeInTheDocument();
    expect(screen.getByText('Approved V1 → Current V2')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('approveChildWorkflowVersions'));
    await waitFor(() =>
      expect(mockHttp.post).toHaveBeenCalledWith(expect.stringContaining('/child_approvals'), {
        body: JSON.stringify({ reviewToken: 'reviewed-token' }),
      })
    );
    expect(mockQuery.refetch).toHaveBeenCalled();
  });
  it('allows review but disables approval without delegation permission', async () => {
    mockQuery.data.canApprove = false;
    mount();
    await userEvent.click(screen.getByTestId('reviewChildWorkflowApprovals'));
    expect(screen.getByTestId('approveChildWorkflowVersions')).toBeDisabled();
    expect(mockHttp.post).not.toHaveBeenCalled();
  });
  it('requires saving the parent before review', () => {
    mount(true);
    expect(screen.getByTestId('reviewChildWorkflowApprovals')).toBeDisabled();
  });
  it('does not render when service accounts are disabled', () => {
    mockEnabled.mockReturnValue(false);
    mount();
    expect(screen.queryByTestId('childWorkflowApprovalStatus')).not.toBeInTheDocument();
  });
  it('keeps the review open after a stale approval is rejected', async () => {
    mockHttp.post.mockRejectedValue(new Error('Workflow changed during review'));
    mount();
    await userEvent.click(screen.getByTestId('reviewChildWorkflowApprovals'));
    await userEvent.click(screen.getByTestId('approveChildWorkflowVersions'));
    expect(await screen.findByText('Workflow changed during review')).toBeInTheDocument();
    expect(mockQuery.refetch).not.toHaveBeenCalled();
  });
});
