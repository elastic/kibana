/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowChangeHistoryEmbed } from './workflow_change_history_embed';
import { TestWrapper } from '../../shared/test_utils';

jest.mock('./use_workflow_change_history', () => ({
  useWorkflowChangeHistoryEnabled: jest.fn(),
  useWorkflowChangeHistoryAdapter: jest.fn(() => ({
    listChanges: jest.fn(),
    getChange: jest.fn(),
  })),
}));

jest.mock('@kbn/change-history-ui', () => ({
  ChangeHistoryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="changeHistoryProvider">{children}</div>
  ),
  ChangeHistoryTrigger: () => <button type="button">{'Change history'}</button>,
  ChangeHistoryModal: () => <div data-test-subj="changeHistoryModal" />,
}));

const { useWorkflowChangeHistoryEnabled } = jest.requireMock('./use_workflow_change_history');

describe('WorkflowChangeHistoryEmbed', () => {
  it('renders nothing when change history is disabled', () => {
    useWorkflowChangeHistoryEnabled.mockReturnValue(false);

    const { container } = render(
      <TestWrapper>
        <WorkflowChangeHistoryEmbed workflowId="workflow-1" />
      </TestWrapper>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders provider, trigger, and modal when enabled', () => {
    useWorkflowChangeHistoryEnabled.mockReturnValue(true);

    render(
      <TestWrapper>
        <WorkflowChangeHistoryEmbed workflowId="workflow-1" />
      </TestWrapper>
    );

    expect(screen.getByTestId('changeHistoryProvider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change history' })).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryModal')).toBeInTheDocument();
  });
});
