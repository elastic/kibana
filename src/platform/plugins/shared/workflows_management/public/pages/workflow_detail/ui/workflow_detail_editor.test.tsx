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
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { TestWrapper } from '../../../shared/test_utils';
import { createMockStore } from '../../../widgets/workflow_yaml_editor/lib/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  setYamlString,
} from '../../../widgets/workflow_yaml_editor/lib/store/slice';

// Mock hooks
const mockUseKibana = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseWorkflowExecution = jest.fn();
const mockUseWorkflowActions = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockUseKibana(),
}));
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));
jest.mock('../../../entities/workflows/model/use_workflow_execution', () => ({
  useWorkflowExecution: () => mockUseWorkflowExecution(),
}));
jest.mock('../../../entities/workflows/model/use_workflow_actions', () => ({
  useWorkflowActions: () => mockUseWorkflowActions(),
}));
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: any) => mockUseSelector(selector),
}));

// Mock lazy loaded components
const WorkflowYAMLEditorMock = ({ workflowYaml, isExecutionYaml, highlightDiff }: any) => (
  <div data-test-subj="workflow-yaml-editor">
    {isExecutionYaml && <span data-test-subj="read-only-indicator">{'Read Only'}</span>}
    {highlightDiff && <span data-test-subj="highlight-diff-indicator">{'Highlight Diff'}</span>}
    <div data-test-subj="yaml-content">{workflowYaml || 'No YAML'}</div>
  </div>
);

jest.mock('../../../widgets/workflow_yaml_editor/ui/workflow_yaml_editor', () => ({
  WorkflowYAMLEditor: WorkflowYAMLEditorMock,
}));

jest.mock('../../../widgets/workflow_yaml_editor', () => ({
  WorkflowYAMLEditor: WorkflowYAMLEditorMock,
}));

jest.mock('../../../features/workflow_visual_editor', () => ({
  WorkflowVisualEditor: ({ workflowYaml }: any) => (
    <div data-test-subj="workflow-visual-editor">
      <div data-test-subj="visual-editor-content">{workflowYaml || 'No YAML'}</div>
    </div>
  ),
}));

jest.mock('../../../features/debug-graph/execution_graph', () => ({
  ExecutionGraph: ({ workflowYaml }: any) => (
    <div data-test-subj="execution-graph">
      <div data-test-subj="execution-graph-content">{workflowYaml || 'No YAML'}</div>
    </div>
  ),
}));

jest.mock('../../../features/run_workflow/ui/test_step_modal', () => ({
  TestStepModal: ({ initialcontextOverride, onSubmit, onClose }: any) => (
    <div data-test-subj="test-step-modal">
      <button
        type="button"
        data-test-subj="submit-step"
        onClick={() => onSubmit({ stepInputs: {} })}
      >
        {'Submit'}
      </button>
      <button type="button" data-test-subj="close-step-modal" onClick={onClose}>
        {'Close'}
      </button>
      <div data-test-subj="context-override">{JSON.stringify(initialcontextOverride)}</div>
    </div>
  ),
}));

jest.mock('./build_step_context_mock_for_step', () => ({
  buildContextOverrideForStep: jest.fn(() => ({
    stepContext: { mockKey: 'mockValue' },
  })),
}));

describe('WorkflowDetailEditor', () => {
  const mockYaml =
    'version: "1"\nname: Test Workflow\ntriggers:\n  - type: manual\nsteps:\n  - type: log\n    with:\n      message: hello';

  const mockStore = () => {
    const store = createMockStore();
    store.dispatch(setYamlString(mockYaml));
    store.dispatch(
      _setComputedDataInternal({
        workflowDefinition: {
          version: '1',
          name: 'Test Workflow',
          enabled: true,
          triggers: [],
          steps: [
            {
              name: 'test-step',
              type: 'test',
              with: {},
            },
          ],
        },
      })
    );
    return store;
  };

  const renderEditor = (props = {}) => {
    const store = mockStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };
    return render(<WorkflowDetailEditor {...props} />, { wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        uiSettings: {
          get: jest.fn((key: string) => {
            if (key === 'workflows.ui.visualEditor') return false;
            if (key === 'workflows.ui.executionGraph') return false;
            return false;
          }),
        },
      },
    });

    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'workflow',
      selectedExecutionId: null,
      setSelectedExecution: jest.fn(),
    });

    mockUseWorkflowExecution.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    mockUseWorkflowActions.mockReturnValue({
      runIndividualStep: {
        mutateAsync: jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' }),
      },
    });

    mockUseSelector.mockImplementation((selector: any) => {
      // Mock selectYamlString
      if (selector.toString().includes('selectYamlString')) {
        return mockYaml;
      }
      // Mock selectWorkflowDefinition
      if (selector.toString().includes('selectWorkflowDefinition')) {
        return {
          version: '1',
          name: 'Test Workflow',
          enabled: true,
          triggers: [],
          steps: [
            {
              name: 'test-step',
              type: 'test',
              with: {},
            },
          ],
        };
      }
      return null;
    });
  });

  describe('rendering', () => {
    it('should render the YAML editor', async () => {
      const { findByTestId } = renderEditor();
      expect(await findByTestId('workflow-yaml-editor')).toBeInTheDocument();
    });

    it('should pass highlightDiff prop to YAML editor', () => {
      const { getByTestId } = renderEditor({ highlightDiff: true });
      expect(getByTestId('highlight-diff-indicator')).toBeInTheDocument();
    });
  });

  describe('configuration options', () => {
    it('should check visual editor configuration', () => {
      const { container } = renderEditor();
      expect(mockUseKibana).toHaveBeenCalled();
      expect(container).toBeTruthy();
    });

    it('should check execution graph configuration', () => {
      const { container } = renderEditor();
      expect(mockUseKibana).toHaveBeenCalled();
      expect(container).toBeTruthy();
    });
  });

  describe('execution mode', () => {
    it('should render editor in read-only mode when activeTab is executions', () => {
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'executions',
        selectedExecutionId: null,
        setSelectedExecution: jest.fn(),
      });

      const { getByTestId } = renderEditor();
      expect(getByTestId('read-only-indicator')).toBeInTheDocument();
    });

    it('should render editor when execution data is provided', () => {
      const mockExecution = {
        yaml: 'execution yaml',
        stepExecutions: [],
      };

      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'executions',
        selectedExecutionId: 'exec-123',
        setSelectedExecution: jest.fn(),
      });

      mockUseWorkflowExecution.mockReturnValue({
        data: mockExecution,
        isLoading: false,
        error: null,
      });

      const { findByTestId } = renderEditor();
      expect(findByTestId('workflow-yaml-editor')).resolves.toBeInTheDocument();
    });
  });
});
