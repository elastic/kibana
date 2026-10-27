/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { WorkflowExecutionsFilters } from './workflow_executions_filters';
import {
  buildExcludeStepRunsFilter,
  buildReadableWorkflowsFilter,
} from './workflow_executions_scope_filters';
import { TestProvider } from '../../shared/mocks/test_providers';
import { FilterControls } from '../../shared/ui/filter_controls';

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsApi: jest.fn(),
}));
jest.mock('../../hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../shared/ui/filter_controls', () => ({
  FilterControls: jest.fn(() => <div data-test-subj="filterControls" />),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;
const mockFilterControls = FilterControls as jest.MockedFunction<typeof FilterControls>;

const renderFilters = () =>
  render(
    <WorkflowExecutionsFilters
      filters={[]}
      onFiltersChange={jest.fn()}
      setControlsUrlState={jest.fn()}
      timeRange={{ from: 'now-15m', to: 'now' }}
    />,
    { wrapper: TestProvider }
  );

describe('WorkflowExecutionsFilters', () => {
  let getReadableWorkflowIds: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getReadableWorkflowIds = jest.fn();
    mockUseWorkflowsApi.mockReturnValue({ getReadableWorkflowIds } as unknown as ReturnType<
      typeof useWorkflowsApi
    >);
  });

  it('renders no controls until the readable workflows are known', () => {
    getReadableWorkflowIds.mockReturnValue(new Promise(() => {}));

    renderFilters();

    expect(screen.queryByTestId('filterControls')).not.toBeInTheDocument();
    expect(mockFilterControls).not.toHaveBeenCalled();
  });

  it('only excludes step runs when no workflow is hidden from the user', async () => {
    getReadableWorkflowIds.mockResolvedValue({});

    renderFilters();

    await waitFor(() => expect(screen.getByTestId('filterControls')).toBeInTheDocument());
    expect(mockFilterControls.mock.calls[0][0].parentFilters).toEqual([
      buildExcludeStepRunsFilter(),
    ]);
  });

  it('limits the controls to the readable workflows', async () => {
    getReadableWorkflowIds.mockResolvedValue({ workflowIds: ['a', 'b'] });

    renderFilters();

    await waitFor(() => expect(screen.getByTestId('filterControls')).toBeInTheDocument());
    expect(mockFilterControls.mock.calls[0][0].parentFilters).toEqual([
      buildExcludeStepRunsFilter(),
      buildReadableWorkflowsFilter(['a', 'b']),
    ]);
  });

  it('keeps the controls hidden when the readable workflows cannot be loaded', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getReadableWorkflowIds.mockRejectedValue(new Error('boom'));

    renderFilters();

    await waitFor(() => expect(getReadableWorkflowIds).toHaveBeenCalled());
    expect(screen.queryByTestId('filterControls')).not.toBeInTheDocument();
  });
});
