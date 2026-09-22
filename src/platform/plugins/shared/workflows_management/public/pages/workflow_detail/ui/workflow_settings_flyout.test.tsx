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
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const BASE_YAML = `version: "1"
name: Test Workflow
tags:
  - alpha
consts:
  region: us-east-1
triggers:
  - type: manual
    inputs:
      type: object
      properties:
        user:
          type: string
outputs:
  type: object
  properties:
    result:
      type: string
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper store={store}>{children}</TestWrapper>
    );

    return {
      store,
      ...render(<WorkflowSettingsFlyout isOpen onClose={jest.fn()} />, { wrapper }),
    };
  };

  it('renders a tab-less flyout with name, tags, and stub groups (no Sharing)', () => {
    renderFlyout();

    expect(screen.getByTestId('workflowSettingsFlyout')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsNameInput')).toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsTagsInput')).toBeInTheDocument();
    expect(screen.getByText('Workflow name')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('Constants')).toBeInTheDocument();
    expect(screen.queryByText('Sharing')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowSettingsInputsList')).toHaveTextContent('user');
    expect(screen.getByTestId('workflowSettingsOutputsList')).toHaveTextContent('result');
    expect(screen.getByTestId('workflowSettingsConstantsList')).toHaveTextContent('region');
  });

  it('updates the draft YAML when the name changes', () => {
    const { store } = renderFlyout();

    fireEvent.change(screen.getByTestId('workflowSettingsNameInput'), {
      target: { value: 'Renamed Workflow' },
    });

    expect(selectYamlString(store.getState())).toContain('name: Renamed Workflow');
    expect(selectYamlString(store.getState())).not.toContain('name: Test Workflow');
  });

  it('updates the draft YAML when tags change', () => {
    const { store } = renderFlyout();

    const clearButton = screen
      .getByTestId('workflowSettingsTagsInput')
      .querySelector('[data-test-subj="comboBoxClearButton"]');
    expect(clearButton).toBeTruthy();
    fireEvent.click(clearButton!);

    expect(selectYamlString(store.getState())).toMatch(/tags:\s*\[\]/);
  });
});
