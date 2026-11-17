/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import type { WorkflowGraphEditActions } from '@kbn/workflows-ui';
import { WorkflowVisualEditorStateful } from './workflow_visual_editor_stateful';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { selectYamlString } from '../../../entities/workflows/store/workflow_detail/selectors';
import {
  applyYamlEdit,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';
import type { ActionOption } from '../../actions_menu_popover/types';

/** What the mocked canvas was last rendered with: the props the shell hands the real one. */
const mockCanvas: {
  props:
    | { edit?: WorkflowGraphEditActions; flashNodeId?: string; canRunSteps?: boolean }
    | undefined;
  renders: number;
} = { props: undefined, renders: 0 };

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: () => ({ canUpdateWorkflow: true, canExecuteWorkflow: true }),
  WorkflowGraphCanvasWithoutProvider: (props: object) => {
    mockCanvas.props = props;
    mockCanvas.renders += 1;
    return <div data-test-subj="mockCanvas" />;
  },
}));
jest.mock('../../../hooks/use_workflow_editor_read_only', () => ({
  useWorkflowEditorReadOnly: () => false,
}));
jest.mock('../../../hooks/use_workflow_url_state', () => {
  const setSelectedStep = jest.fn();
  const setEditorView = jest.fn();
  return {
    useWorkflowUrlState: () => ({ selectedStepId: undefined, setSelectedStep, setEditorView }),
  };
});
jest.mock('./use_step_fragment_yaml_support', () => ({
  useStepFragmentYamlSupport: () => undefined,
}));
jest.mock('@kbn/shared-ux-error-boundary', () => ({
  KibanaSectionErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('./step_config_panel', () => ({
  StepConfigPanel: () => <div data-test-subj="mockStepConfigPanel" />,
}));
jest.mock('./trigger_config_panel', () => ({
  TriggerConfigPanel: () => <div data-test-subj="mockTriggerConfigPanel" />,
}));
/** The insert menu's props, so a test can pick an action the way a click on a row would. */
const mockMenu: { props: { onActionSelected: (action: ActionOption) => void } | undefined } = {
  props: undefined,
};
jest.mock('../../actions_menu_popover', () => ({
  ActionsMenuPopover: (props: { onActionSelected: (action: ActionOption) => void }) => {
    mockMenu.props = props;
    return null;
  },
}));

const yamlWithMessage = (message: string) => `version: "1"
name: Test
enabled: false
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: ${message}
  - name: second
    type: console
    with:
      message: two
`;

const renderEditor = (
  yaml: string,
  props: React.ComponentProps<typeof WorkflowVisualEditorStateful> = {}
) => {
  const services = createStartServicesMock();
  const store = createMockStore(services);
  // `applyYamlEdit` computes the graph data synchronously, so the editor renders a workflow.
  store.dispatch(applyYamlEdit(yaml));
  render(
    <TestProvider store={store} services={services}>
      <WorkflowVisualEditorStateful {...props} />
    </TestProvider>
  );
  return { store, toasts: services.notifications.toasts };
};

const consoleAction: ActionOption = { id: 'console', label: 'Console', iconType: 'commandLine' };
const anchor = { left: 0, top: 0, width: 10, height: 10 };

/** Clicks the Undo button of the toast the last delete showed. */
const clickUndoOfLastDeleteToast = (toasts: ReturnType<typeof renderEditor>['toasts']) => {
  const [toast] = toasts.addSuccess.mock.calls[toasts.addSuccess.mock.calls.length - 1];
  const undo = typeof toast === 'string' ? undefined : toast.actionProps?.primary?.onClick;
  if (!undo) throw new Error('The delete toast has no Undo action');
  // The handler ignores the click event, so a bare object stands in for it.
  undo({} as React.MouseEvent<HTMLAnchorElement> & React.MouseEvent<HTMLButtonElement>);
};

describe('WorkflowVisualEditorStateful', () => {
  beforeEach(() => {
    mockCanvas.props = undefined;
    mockCanvas.renders = 0;
    mockMenu.props = undefined;
  });

  it('renders the canvas with edit actions for a user who can edit', () => {
    renderEditor(yamlWithMessage('one'));

    expect(mockCanvas.props?.edit).toBeDefined();
  });

  describe('Run controls', () => {
    it('are offered when the parent hands over a run handler', () => {
      renderEditor(yamlWithMessage('one'), { onStepRun: jest.fn() });

      expect(mockCanvas.props?.canRunSteps).toBe(true);
    });

    it('are not offered without one, whatever the global capability says', () => {
      renderEditor(yamlWithMessage('one'));

      expect(mockCanvas.props?.canRunSteps).toBe(false);
    });
  });

  describe('canvas edit actions', () => {
    it('keep their identity while the YAML text changes', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      const initial = mockCanvas.props?.edit;
      expect(initial).toBeDefined();

      // A keystroke in a step field rewrites the YAML on every press.
      act(() => {
        store.dispatch(setYamlString(yamlWithMessage('one two')));
      });
      act(() => {
        store.dispatch(applyYamlEdit(yamlWithMessage('one two three')));
      });

      // The canvas context holds these: a new object re-renders every node, so it must not churn.
      expect(mockCanvas.props?.edit).toBe(initial);
    });

    it('still delete the step the canvas names, after the YAML has changed', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      act(() => {
        store.dispatch(applyYamlEdit(yamlWithMessage('one two')));
      });

      act(() => mockCanvas.props?.edit?.onDeleteNode('first'));

      // The deletion must start from the latest YAML, not the one the actions were created with.
      const yaml = selectYamlString(store.getState());
      expect(yaml).not.toContain('name: first');
      expect(yaml).toContain('name: second');
    });
  });

  describe('Undo on the delete toast', () => {
    it('restores a document nothing touched since the delete', () => {
      const original = yamlWithMessage('one');
      const { store, toasts } = renderEditor(original);

      act(() => mockCanvas.props?.edit?.onDeleteNode('first'));
      expect(selectYamlString(store.getState())).not.toContain('name: first');
      act(() => clickUndoOfLastDeleteToast(toasts));

      expect(selectYamlString(store.getState())).toBe(original);
      expect(toasts.addWarning).not.toHaveBeenCalled();
    });

    it('does not wipe an edit made after the delete, and says so', () => {
      const { store, toasts } = renderEditor(yamlWithMessage('one'));

      act(() => mockCanvas.props?.edit?.onDeleteNode('first'));
      const afterEdit = `${selectYamlString(store.getState())}# edited after the delete\n`;
      act(() => {
        store.dispatch(setYamlString(afterEdit));
      });
      act(() => clickUndoOfLastDeleteToast(toasts));

      expect(selectYamlString(store.getState())).toBe(afterEdit);
      expect(toasts.addWarning).toHaveBeenCalledTimes(1);
    });
  });

  describe('inserting a step', () => {
    it('flashes the inserted node by its graph id, which is the slug of the step name', () => {
      const { store } = renderEditor(yamlWithMessage('one'));

      act(() => mockCanvas.props?.edit?.onInsert({ mode: 'after', stepName: 'first' }, anchor));
      act(() => mockMenu.props?.onActionSelected(consoleAction));

      // The default step is named `console_step`; its node id replaces `_` with `-`.
      expect(selectYamlString(store.getState())).toContain('name: console_step');
      expect(mockCanvas.props?.flashNodeId).toBe('console-step');
    });
  });
});
