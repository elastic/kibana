/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowChangeHistoryItemChangesSummary } from './workflow_change_history_item_changes_summary';
import { TestProvider } from '../../shared/mocks/test_providers';

describe('WorkflowChangeHistoryItemChangesSummary', () => {
  it('renders grouped counts per entity', () => {
    render(
      <WorkflowChangeHistoryItemChangesSummary
        groups={[
          {
            title: 'Steps:',
            lines: ['1 added', '2 removed', '3 updated'],
          },
          {
            title: 'Triggers:',
            lines: ['3 added', '2 removed', '1 updated'],
          },
          {
            title: 'Settings:',
            lines: ['1 updated'],
          },
        ]}
      />,
      { wrapper: TestProvider }
    );

    expect(screen.getByTestId('workflowChangeHistoryItemChangesSummary')).toBeInTheDocument();
    expect(screen.getByText('Steps:')).toBeInTheDocument();
    expect(screen.getByText('1 added')).toBeInTheDocument();
    expect(screen.getAllByText('2 removed')).toHaveLength(2);
    expect(screen.getAllByText('3 updated')).toHaveLength(1);
    expect(screen.getByText('Triggers:')).toBeInTheDocument();
    expect(screen.getByText('3 added')).toBeInTheDocument();
    expect(screen.getByText('Settings:')).toBeInTheDocument();
  });
});
