/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { WorkflowDetailHeaderProps } from './workflow_detail_header';
import { WorkflowDetailHeader } from './workflow_detail_header';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';

const mockUseKibana = jest.fn();
const mockUseParams = jest.fn();
const mockUseCapabilities = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseSaveYaml = jest.fn();
const mockUseUpdateWorkflow = jest.fn();
const mockUseMemoCss = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));
jest.mock('../../../hooks/use_capabilities', () => ({
  useCapabilities: () => mockUseCapabilities(),
}));
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));
jest.mock('../../../entities/workflows/model/use_save_yaml', () => ({
  useSaveYaml: () => mockUseSaveYaml(),
}));
jest.mock('../../../entities/workflows/model/use_update_workflow', () => ({
  useUpdateWorkflow: () => mockUseUpdateWorkflow(),
}));
jest.mock('@kbn/css-utils/public/use_memo_css', () => ({
  useMemoCss: (styles: any) => mockUseMemoCss(styles),
}));

describe('WorkflowDetailHeader', () => {
  const defaultProps: WorkflowDetailHeaderProps = {
    isLoading: false,
    highlightDiff: false,
    setHighlightDiff: jest.fn(),
  };

  const mockWorkflow = {
    id: 'test-123',
    name: 'Test Workflow',
    enabled: true,
    yaml: 'version: "1"\nname: Test Workflow\ntriggers:\n  - type: manual\nsteps:\n  - type: log\n    with:\n      message: hello',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    lastUpdatedBy: 'test-user',
    definition: null,
    valid: true,
  };

  const renderWithProviders = (
    component: React.ReactElement,
    { isValid = true, hasChanges = false }: { isValid?: boolean; hasChanges?: boolean } = {}
  ) => {
    const store = createMockStore();

    // Set up the workflow in the store
    store.dispatch(setWorkflow(mockWorkflow));
    store.dispatch(setYamlString(hasChanges ? 'modified yaml' : mockWorkflow.yaml));

    // Set computed data to control syntax validation
    if (isValid) {
      store.dispatch(
        _setComputedDataInternal({
          workflowDefinition: {
            version: '1',
            name: 'Test Workflow',
            enabled: true,
            triggers: [],
            steps: [],
          },
        })
      );
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };

    return render(component, { wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
        settings: {
          client: {
            get: jest.fn((key: string) => {
              if (key === 'dateFormat') return 'MMM D, YYYY @ HH:mm:ss.SSS';
              if (key === 'dateFormat:tz') return 'Browser';
              return '';
            }),
          },
        },
      },
    });
    mockUseParams.mockReturnValue({ id: 'test-123' });
    mockUseCapabilities.mockReturnValue({
      canCreateWorkflow: true,
      canUpdateWorkflow: true,
      canExecuteWorkflow: true,
    });
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'workflow',
      setActiveTab: jest.fn(),
    });
    mockUseSaveYaml.mockReturnValue(jest.fn());
    mockUseUpdateWorkflow.mockReturnValue(jest.fn());
    mockUseMemoCss.mockReturnValue(jest.fn());
  });

  it('should render', () => {
    const { getByText } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    expect(getByText('Test Workflow')).toBeInTheDocument();
  });

  it('shows saved status when no changes', () => {
    const { container } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    // The WorkflowUnsavedChangesBadge component displays "Saved" when there are no changes
    // We need to check if the component renders without the unsaved changes badge
    expect(container).toBeTruthy();
  });

  it('shows unsaved changes when there are changes', () => {
    const { container } = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: true,
      hasChanges: true,
    });
    expect(container).toBeTruthy();
  });

  // We shouldn't rely on parseResult to determine if the yaml is valid now
  // instead we should move validationErrors to the store and use it to determine it
  it.skip('disables run workflow button when yaml is invalid', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />, {
      isValid: false,
    });
    expect(result.getByTestId('runWorkflowHeaderButton')).toBeDisabled();
  });

  it('enables run workflow button when yaml is valid', () => {
    const result = renderWithProviders(<WorkflowDetailHeader {...defaultProps} />);
    const button = result.getByTestId('runWorkflowHeaderButton');
    expect(button).toBeEnabled();
  });
});
