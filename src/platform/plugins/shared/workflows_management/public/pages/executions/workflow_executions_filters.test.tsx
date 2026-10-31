/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflowsApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowExecutionsFilters } from './workflow_executions_filters';
import {
  DEFAULT_EXECUTION_PAGE_FILTERS,
  EXECUTED_BY_FILTER_FIELD,
} from './workflow_executions_page_constants';
import {
  buildExcludeManagedExecutionsFilter,
  buildExcludeStepRunsFilter,
  buildReadableWorkflowsFilter,
} from './workflow_executions_scope_filters';
import { TestProvider } from '../../shared/mocks/test_providers';
import { FilterControls } from '../../shared/ui/filter_controls';

const mockUseUiSetting = jest.fn((_settingId: string, defaultValue?: boolean) => defaultValue);

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: (settingId: string, defaultValue?: boolean) =>
    mockUseUiSetting(settingId, defaultValue),
}));
jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsApi: jest.fn(),
  useWorkflowsCapabilities: jest.fn(),
}));
jest.mock('../../hooks/use_space_id', () => ({ useSpaceId: () => 'default' }));
jest.mock('../../shared/ui/filter_controls', () => ({
  FilterControls: jest.fn(() => <div data-test-subj="filterControls" />),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;
const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;
const mockFilterControls = FilterControls as jest.MockedFunction<typeof FilterControls>;

const renderFilters = (
  props: Partial<React.ComponentProps<typeof WorkflowExecutionsFilters>> = {}
) =>
  render(
    <WorkflowExecutionsFilters
      filters={[]}
      onFiltersChange={jest.fn()}
      setControlsUrlState={jest.fn()}
      timeRange={{ from: 'now-15m', to: 'now' }}
      {...props}
    />,
    { wrapper: TestProvider }
  );

describe('WorkflowExecutionsFilters', () => {
  let getReadableWorkflowIds: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUiSetting.mockImplementation(
      (_settingId: string, defaultValue?: boolean) => defaultValue
    );
    getReadableWorkflowIds = jest.fn();
    mockUseWorkflowsCapabilities.mockReturnValue({
      canReadManagedWorkflowExecution: true,
    } as ReturnType<typeof useWorkflowsCapabilities>);
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

  it('excludes managed executions when the user cannot read them', async () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      canReadManagedWorkflowExecution: false,
    } as ReturnType<typeof useWorkflowsCapabilities>);
    getReadableWorkflowIds.mockResolvedValue({});

    renderFilters();

    await waitFor(() => expect(screen.getByTestId('filterControls')).toBeInTheDocument());
    expect(mockFilterControls.mock.calls[0][0].parentFilters).toEqual([
      buildExcludeStepRunsFilter(),
      buildExcludeManagedExecutionsFilter(),
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

  it('shows an error with a retry instead of the controls when the readable workflows cannot be loaded', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getReadableWorkflowIds.mockRejectedValueOnce(new Error('boom'));
    getReadableWorkflowIds.mockResolvedValueOnce({ workflowIds: ['a'] });

    renderFilters();

    await waitFor(() =>
      expect(screen.getByTestId('workflowExecutionsFiltersError')).toBeInTheDocument()
    );
    expect(screen.queryByTestId('filterControls')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowExecutionsFiltersRetry'));

    await waitFor(() => expect(screen.getByTestId('filterControls')).toBeInTheDocument());
    expect(screen.queryByTestId('workflowExecutionsFiltersError')).not.toBeInTheDocument();
    expect(getReadableWorkflowIds).toHaveBeenCalledTimes(2);
  });

  it('offers the "Triggered by" control on the display-name field by default', async () => {
    getReadableWorkflowIds.mockResolvedValue({});

    renderFilters();

    await waitFor(() => expect(screen.getByTestId('filterControls')).toBeInTheDocument());
    const { defaultControls } = mockFilterControls.mock.calls[0][0];
    expect(defaultControls).toEqual(DEFAULT_EXECUTION_PAGE_FILTERS);
    expect(defaultControls?.map(({ field_name: fieldName }) => fieldName)).toContain(
      EXECUTED_BY_FILTER_FIELD
    );
  });

  it('removes the "Triggered by" control everywhere when the show-executor setting is off', async () => {
    mockUseUiSetting.mockReturnValue(false);
    getReadableWorkflowIds.mockResolvedValue({});

    renderFilters({
      controlsUrlState: [
        { field_name: 'status' },
        { field_name: EXECUTED_BY_FILTER_FIELD, selected_options: ['Jane Doe'] },
      ],
    });

    await waitFor(() => expect(screen.getByTestId('filterControls')).toBeInTheDocument());
    const { controlsUrlState, defaultControls } = mockFilterControls.mock.calls[0][0];
    expect(defaultControls?.map(({ field_name: fieldName }) => fieldName)).toEqual([
      'status',
      'workflowId',
      'triggeredBy',
    ]);
    expect(controlsUrlState).toEqual([{ field_name: 'status' }]);
  });
});
