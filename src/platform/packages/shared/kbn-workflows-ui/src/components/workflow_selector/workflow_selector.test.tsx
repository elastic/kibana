/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { WorkflowSelector } from './workflow_selector';

const mockWorkflows: WorkflowListItemDto[] = [
  {
    id: 'first-workflow',
    name: 'First workflow',
    description: 'The first workflow',
    enabled: true,
    valid: true,
    createdAt: '',
    definition: {
      triggers: [{ type: 'manual' }],
    } as WorkflowListItemDto['definition'],
  },
  {
    id: 'second-workflow',
    name: 'Second workflow',
    description: 'The second workflow',
    enabled: true,
    valid: true,
    createdAt: '',
    definition: {
      triggers: [{ type: 'manual' }],
    } as WorkflowListItemDto['definition'],
  },
];

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: () => '/app/workflows',
      },
    },
  }),
}));

jest.mock('../../hooks', () => ({
  useWorkflows: () => ({ data: { results: mockWorkflows } }),
  useWorkflowsCapabilities: () => ({ canReadManagedWorkflow: true }),
}));

describe('WorkflowSelector', () => {
  it('keeps the search term after selecting an option when the selection is hidden from search', () => {
    const onWorkflowChange = jest.fn();
    render(
      <WorkflowSelector
        onWorkflowChange={onWorkflowChange}
        config={{
          hideTopRowHeader: true,
          hideViewWorkflowLink: true,
          listView: true,
          showSelectedInSearch: false,
        }}
      />
    );

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Second' } });
    fireEvent.click(screen.getByRole('option', { name: /Second workflow/i }));

    expect(onWorkflowChange).toHaveBeenCalledWith('second-workflow');
    expect(searchInput).toHaveValue('Second');
  });
});
