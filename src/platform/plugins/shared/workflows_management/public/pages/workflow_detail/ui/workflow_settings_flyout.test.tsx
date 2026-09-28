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
import { WorkflowSettingsFlyout } from './workflow_settings_flyout';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { selectYamlString } from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  setConnectors,
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

jest.mock('../../../entities/workflows/model/use_workflow_stats', () => ({
  useWorkflowFiltersOptions: () => ({ data: { tags: [{ label: 'shared', key: 'shared' }] } }),
  useWorkflowStats: () => ({ data: undefined }),
}));

const BASE_YAML = `version: "1"
name: Test Workflow
description: A short description
tags:
  - alpha
consts:
  region: us-east-1
triggers:
  - type: manual
steps:
  - name: log
    type: console
    with:
      message: hello
`;

describe('WorkflowSettingsFlyout', () => {
  const renderFlyout = (yaml = BASE_YAML) => {
    const store = createMockStore();
    store.dispatch(
      setWorkflow({
        id: 'wf-1',
        name: 'Test Workflow',
        enabled: true,
        yaml,
        lastUpdatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        definition: null,
        valid: true,
        tags: ['alpha'],
      })
    );
    store.dispatch(setYamlString(yaml));
    // Real store shape — ConnectorsResponse, not an array. Outputs tab must unwrap it.
    store.dispatch(
      setConnectors({
        connectorTypes: {},
        totalConnectors: 0,
      })
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper store={store}>{children}</TestWrapper>
    );

    return {
      store,
      ...render(<WorkflowSettingsFlyout isOpen onClose={jest.fn()} />, { wrapper }),
    };
  };

  it('opens on General with name, description, and tags', () => {
    renderFlyout();

    expect(screen.getByTestId('workflowSettingsFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsTab-general')).toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsTab-constants')).toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsTab-outputs')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowSettingsTab-sharing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowSettingsTab-serviceAccount')).not.toBeInTheDocument();

    expect(screen.getByTestId('workflowSettingsNameInput')).toHaveValue('Test Workflow');
    expect(screen.getByTestId('workflowSettingsDescriptionInput')).toHaveValue(
      'A short description'
    );
    expect(screen.getByTestId('workflowSettingsTagsInput')).toBeInTheDocument();
  });

  it('updates the draft YAML when the name changes', () => {
    const { store } = renderFlyout();

    fireEvent.change(screen.getByTestId('workflowSettingsNameInput'), {
      target: { value: 'Renamed Workflow' },
    });

    expect(selectYamlString(store.getState())).toContain('name: Renamed Workflow');
  });

  it('removes description from YAML when cleared', () => {
    const { store } = renderFlyout();

    fireEvent.change(screen.getByTestId('workflowSettingsDescriptionInput'), {
      target: { value: '' },
    });
    fireEvent.blur(screen.getByTestId('workflowSettingsDescriptionInput'));

    expect(selectYamlString(store.getState())).not.toContain('description');
  });

  it('shows the Manual-trigger inputs hint on General', () => {
    renderFlyout();
    expect(screen.getByTestId('workflowSettingsInputsHint')).toBeInTheDocument();
  });

  it('loads existing constants on the Constants tab and can add another', () => {
    const { store } = renderFlyout();

    fireEvent.click(screen.getByTestId('workflowSettingsTab-constants'));
    expect(screen.getByTestId('workflowSettingsConstAdd')).toBeInTheDocument();
    expect(screen.getByDisplayValue('region')).toBeInTheDocument();
    expect(screen.getByDisplayValue('us-east-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowSettingsConstAdd'));
    fireEvent.click(screen.getByTestId('workflowSettingsFlyoutDone'));
    expect(selectYamlString(store.getState())).toContain('region');
  });

  it('shows the outputs empty state when none are defined', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('workflowSettingsTab-outputs'));
    expect(screen.getByTestId('workflowSettingsOutputEmpty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('workflowSettingsOutputAdd'));
    expect(screen.queryByTestId('workflowSettingsOutputEmpty')).not.toBeInTheDocument();
    expect(screen.getByTestId(/workflowSettingsOutputValue-/)).toBeInTheDocument();
  });
});
