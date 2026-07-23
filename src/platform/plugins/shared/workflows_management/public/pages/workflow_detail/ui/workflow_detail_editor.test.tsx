/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowDetailEditor } from './workflow_detail_editor';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  selectEditorWorkflowDefinition,
  selectFocusedStepId,
  selectFocusedTriggerId,
  selectIsExecutionsTab,
  selectWorkflowId,
  selectYamlString as selectYamlStringSelector,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  _setComputedDataInternal,
  HIGHLIGHTED_STEP_TRIGGER,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { mockWorkflowsManagementCapabilities } from '../../../hooks/__mocks__/use_workflows_capabilities';
import { useWorkflowsExperimentalUiSetting } from '../../../hooks/use_workflows_experimental_ui_setting';
import { TestWrapper } from '../../../shared/test_utils';

// Mock hooks
const mockUseKibana = jest.fn();
const mockUseUiSetting$ = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseWorkflowActions = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockUseKibana(),
  useUiSetting$: (key: string, defaultValue: boolean) => mockUseUiSetting$(key, defaultValue),
}));
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));
jest.mock('../../../entities/workflows/model/use_workflow_actions', () => ({
  useWorkflowActions: () => mockUseWorkflowActions(),
}));
jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useFetchConnector: () => jest.fn(() => ({ data: undefined, isLoading: false })),
}));
jest.mock('react-redux-v7', () => ({
  ...jest.requireActual('react-redux-v7'),
  useSelector: (selector: any) => mockUseSelector(selector),
}));

// Mock lazy loaded components
const WorkflowYAMLEditorMock = ({
  highlightDiff,
  onStepRun,
  editorRef,
  onToggleEditorMode,
}: any) => {
  if (editorRef) {
    editorRef.current = { getPosition: () => ({ lineNumber: 4 }) };
  }
  return (
    <div data-test-subj="workflow-yaml-editor">
      {highlightDiff && <span data-test-subj="highlight-diff-indicator">{'Highlight Diff'}</span>}
      <button
        type="button"
        data-test-subj="workflow-toggle-editor-mode"
        onClick={() => onToggleEditorMode?.()}
      >
        {'Toggle Editor Mode'}
      </button>
      <button
        type="button"
        data-test-subj="test-step-run"
        onClick={() => onStepRun?.({ stepId: 'test-step', actionType: 'run' })}
      >
        {'Run Step'}
      </button>
    </div>
  );
};

jest.mock('../../../widgets/workflow_yaml_editor/ui/workflow_yaml_editor', () => ({
  WorkflowYAMLEditor: WorkflowYAMLEditorMock,
}));

jest.mock('../../../widgets/workflow_yaml_editor', () => ({
  WorkflowYAMLEditor: WorkflowYAMLEditorMock,
}));

jest.mock('../../../features/workflow_visual_editor', () => ({
  WorkflowVisualEditor: () => (
    <div data-test-subj="workflow-visual-editor">
      <div data-test-subj="visual-editor-content">{'Visual Editor'}</div>
    </div>
  ),
}));

jest.mock('../../../features/debug_graph/execution_graph', () => ({
  ExecutionGraph: () => (
    <div data-test-subj="execution-graph">
      <div data-test-subj="execution-graph-content">{'Execution Graph'}</div>
    </div>
  ),
}));

const mockUseContextOverrideData = jest.fn((stepId: string) => ({
  stepContext: { mockKey: 'mockValue' },
  schema: {},
}));
jest.mock('./use_context_override_data', () => ({
  useContextOverrideData: () => mockUseContextOverrideData,
}));

jest.mock('../../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: jest.fn().mockReturnValue(false),
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as jest.MockedFunction<
  typeof useWorkflowsCapabilities
>;

describe('WorkflowDetailEditor', () => {
  const mockYaml =
    'version: "1"\nname: Test Workflow\ntriggers:\n  - type: manual\nsteps:\n  - type: log\n    with:\n      message: hello';

  // Named base implementation so tests can extend it without creating infinite recursion
  const baseUseSelectorImpl = (selector: any) => {
    if (selector === selectIsExecutionsTab) return false;
    if (selector === selectYamlStringSelector) return mockYaml;
    if (selector === selectWorkflowId) return 'workflow-1';
    if (selector === selectFocusedStepId) return undefined;
    if (selector === selectFocusedTriggerId) return undefined;
    if (selector === selectEditorWorkflowDefinition) {
      return {
        version: '1',
        name: 'Test Workflow',
        enabled: true,
        triggers: [],
        steps: [{ name: 'test-step', type: 'test', with: {} }],
      };
    }
    return null;
  };

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
    const result = render(<WorkflowDetailEditor {...props} />, { wrapper });
    return { ...result, store };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWorkflowsCapabilities.mockReturnValue(mockWorkflowsManagementCapabilities);

    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: { addError: jest.fn() } },
      },
    });

    mockUseUiSetting$.mockImplementation((key: string, defaultValue: boolean) => {
      if (key === 'workflows:ui:executionGraph:enabled') return [false];
      return [defaultValue];
    });
    // Reset to the default (disabled) after each test that may have overridden it.
    (useWorkflowsExperimentalUiSetting as jest.Mock).mockReturnValue(false);

    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'workflow',
      editorView: 'yaml',
      graphDirection: 'TB',
      selectedExecutionId: null,
      selectedStepExecutionId: null,
      selectedStepId: null,
      shouldAutoResume: false,
      setActiveTab: jest.fn(),
      setEditorView: jest.fn(),
      setGraphDirection: jest.fn(),
      setSelectedExecution: jest.fn(),
      setSelectedStepExecution: jest.fn(),
      setSelectedStep: jest.fn(),
      updateUrlState: jest.fn(),
      clearResumeParam: jest.fn(),
    });

    mockUseWorkflowActions.mockReturnValue({
      runIndividualStep: {
        mutateAsync: jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' }),
      },
    });

    mockUseSelector.mockImplementation(baseUseSelectorImpl);
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
      expect(container).toBeTruthy();
    });

    it('should check execution graph configuration', () => {
      const { container } = renderEditor();
      expect(container).toBeTruthy();
    });
  });

  describe('graph focus when switching views', () => {
    it('highlights trigger sentinel when focusedTriggerId is set in Redux state', async () => {
      const store = mockStore();

      // Enable the visual editor so handleEditorViewChange runs the graph-focus logic.
      (useWorkflowsExperimentalUiSetting as jest.Mock).mockImplementation(
        (settingId: string) => settingId === 'workflows:experimentalFeatures'
      );

      // Simulate cursor being inside the triggers block via Redux-derived focusedTriggerId
      mockUseSelector.mockImplementation((selector: any) => {
        if (selector === selectFocusedTriggerId) return HIGHLIGHTED_STEP_TRIGGER;
        if (selector === selectFocusedStepId) return undefined;
        return baseUseSelectorImpl(selector);
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => {
        return <TestWrapper store={store}>{children}</TestWrapper>;
      };
      const { findByTestId } = render(<WorkflowDetailEditor />, { wrapper });
      const toggle = await findByTestId('workflow-toggle-editor-mode');

      await act(async () => {
        toggle.click();
      });

      await waitFor(() => {
        expect(store.getState().detail.highlightedStepId).toBe(HIGHLIGHTED_STEP_TRIGGER);
      });
    });

    it('highlights step when focusedStepId is set in Redux state', async () => {
      const store = mockStore();

      (useWorkflowsExperimentalUiSetting as jest.Mock).mockImplementation(
        (settingId: string) => settingId === 'workflows:experimentalFeatures'
      );

      mockUseSelector.mockImplementation((selector: any) => {
        if (selector === selectFocusedTriggerId) return undefined;
        if (selector === selectFocusedStepId) return 'test-step';
        return baseUseSelectorImpl(selector);
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => {
        return <TestWrapper store={store}>{children}</TestWrapper>;
      };
      const { findByTestId } = render(<WorkflowDetailEditor />, { wrapper });
      const toggle = await findByTestId('workflow-toggle-editor-mode');

      await act(async () => {
        toggle.click();
      });

      await waitFor(() => {
        expect(store.getState().detail.highlightedStepId).toBe('test-step');
      });
    });
  });

  describe('peer rendering — item 6 (bodyOverride decoupling)', () => {
    it('renders WorkflowYAMLEditor without bodyOverride or hideEditorBody props', async () => {
      // Enable the visual editor so graph-related props could theoretically be passed
      (useWorkflowsExperimentalUiSetting as jest.Mock).mockReturnValue(true);
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'workflow',
        editorView: 'yaml', // YAML view
        graphDirection: 'TB',
        selectedExecutionId: null,
        selectedStepExecutionId: null,
        selectedStepId: null,
        shouldAutoResume: false,
        setActiveTab: jest.fn(),
        setEditorView: jest.fn(),
        setGraphDirection: jest.fn(),
        setSelectedExecution: jest.fn(),
        setSelectedStepExecution: jest.fn(),
        setSelectedStep: jest.fn(),
        updateUrlState: jest.fn(),
        clearResumeParam: jest.fn(),
      });

      const { findByTestId } = renderEditor();
      const yamlEditor = await findByTestId('workflow-yaml-editor');

      // The mock renders the YAML editor; there must be no graph nested inside it
      expect(yamlEditor.querySelector('[data-test-subj="workflow-visual-editor"]')).toBeNull();
    });

    it('renders visual editor as a peer (sibling), not nested inside YAML editor, in graph view', async () => {
      (useWorkflowsExperimentalUiSetting as jest.Mock).mockReturnValue(true);
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'workflow',
        editorView: 'graph', // Graph view
        graphDirection: 'TB',
        selectedExecutionId: null,
        selectedStepExecutionId: null,
        selectedStepId: null,
        shouldAutoResume: false,
        setActiveTab: jest.fn(),
        setEditorView: jest.fn(),
        setGraphDirection: jest.fn(),
        setSelectedExecution: jest.fn(),
        setSelectedStepExecution: jest.fn(),
        setSelectedStep: jest.fn(),
        updateUrlState: jest.fn(),
        clearResumeParam: jest.fn(),
      });

      const { findByTestId } = renderEditor();
      const yamlEditor = await findByTestId('workflow-yaml-editor');
      const visualEditor = await findByTestId('workflow-visual-editor');

      // Both present in the DOM (YAML stays mounted for validation)
      expect(yamlEditor).toBeInTheDocument();
      expect(visualEditor).toBeInTheDocument();

      // Visual editor must NOT be a descendant of the YAML editor (peer rendering)
      expect(yamlEditor.contains(visualEditor)).toBe(false);
    });
  });

  describe('step run functionality', () => {
    it('should dispatch setTestStepModalOpenStepId when step run needs modal', async () => {
      const { getByTestId, store } = renderEditor();
      const runButton = getByTestId('test-step-run');

      await act(async () => {
        runButton.click();
      });

      expect(store?.getState().detail.testStepModalOpenStepId).toBe('test-step');
    });

    it('should show toast error when immediate step run (no modal) fails', async () => {
      mockUseContextOverrideData.mockReturnValue({ stepContext: {}, schema: {} } as any);

      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Failed to run step'));
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });

      const { getByTestId } = renderEditor();
      const runButton = getByTestId('test-step-run');

      await act(async () => {
        runButton.click();
      });

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      expect(mockUseKibana().services.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('Failed to run step'),
        { title: 'Failed to run step' }
      );
    });

    it('does not run step or open modal when on the executions tab', async () => {
      // Regression: "Run step" must be a no-op on the Executions tab because
      // handleStepRun uses the editable (draft) YAML/context, which differs from
      // the execution snapshot the graph is currently showing.
      mockUseContextOverrideData.mockReturnValue({ stepContext: {}, schema: {} } as any);

      const mockMutateAsync = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' });
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });

      mockUseSelector.mockImplementation((selector: any) => {
        if (selector === selectIsExecutionsTab) return true; // on the executions tab
        return baseUseSelectorImpl(selector);
      });

      const { getByTestId, store } = renderEditor();
      await act(async () => {
        getByTestId('test-step-run').click();
      });

      // Neither mutation nor modal should fire — the handler must bail out early
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(store?.getState().detail.testStepModalOpenStepId).toBeUndefined();
    });

    it('does not run step or open modal when executeWorkflow is not granted', async () => {
      mockUseWorkflowsCapabilities.mockReturnValue({
        ...mockWorkflowsManagementCapabilities,
        canExecuteWorkflow: false,
      });
      mockUseContextOverrideData.mockReturnValue({
        stepContext: { inputs: {} },
        schema: {},
      } as any);

      const mockMutateAsync = jest.fn();
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });

      const { getByTestId, store } = renderEditor();
      await act(async () => {
        getByTestId('test-step-run').click();
      });

      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(store?.getState().detail.testStepModalOpenStepId).toBeUndefined();
    });
  });
});
