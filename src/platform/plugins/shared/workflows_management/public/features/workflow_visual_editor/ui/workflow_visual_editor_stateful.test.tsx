/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, screen } from '@testing-library/react';
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
    | {
        edit?: WorkflowGraphEditActions;
        flashNodeId?: string;
        canRunSteps?: boolean;
        transformed?: { nodeRefs: Record<string, { kind: string; triggerIndex?: number }> };
        onStepSelect?: (id: string | undefined) => void;
      }
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
const mockExperimentalFeatures = { enabled: true };
jest.mock('../../../hooks/use_workflows_experimental_ui_setting', () => ({
  useWorkflowsExperimentalUiSetting: () => mockExperimentalFeatures.enabled,
}));
jest.mock('../../../hooks/use_workflow_editor_read_only', () => ({
  useWorkflowEditorReadOnly: () => false,
}));
/** The selection the URL would hold: tests change it, and the editor re-renders like on a navigation. */
const mockUrlState: { selectedStepId: string | undefined; listeners: Set<() => void> } = {
  selectedStepId: undefined,
  listeners: new Set(),
};
jest.mock('../../../hooks/use_workflow_url_state', () => {
  const { useSyncExternalStore } = jest.requireActual('react');
  const setSelectedStep = (id: string | null) => {
    mockUrlState.selectedStepId = id ?? undefined;
    mockUrlState.listeners.forEach((listener) => listener());
  };
  const setEditorView = jest.fn();
  const subscribe = (listener: () => void) => {
    mockUrlState.listeners.add(listener);
    return () => mockUrlState.listeners.delete(listener);
  };
  const getSnapshot = () => mockUrlState.selectedStepId;
  return {
    useWorkflowUrlState: () => ({
      selectedStepId: useSyncExternalStore(subscribe, getSnapshot),
      setSelectedStep,
      setEditorView,
    }),
  };
});
jest.mock('./use_step_fragment_yaml_support', () => ({
  useStepFragmentYamlSupport: () => undefined,
}));
jest.mock('@kbn/shared-ux-error-boundary', () => ({
  KibanaSectionErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
/** What the editor last handed the step panel, so a test can type into it the way the form would. */
const mockStepPanel: {
  props:
    | {
        onFragmentChange?: (fragment: string) => void;
        onRevert: () => void;
        syncedFragment?: { fragment: string };
        readOnly?: boolean;
      }
    | undefined;
} = { props: undefined };
jest.mock('./step_config_panel', () => ({
  StepConfigPanel: (props: NonNullable<typeof mockStepPanel.props>) => {
    mockStepPanel.props = props;
    return <div data-test-subj="mockStepConfigPanel" />;
  },
}));
/** Same for the trigger panel. */
const mockTriggerPanel: {
  props:
    | {
        mode: 'insert' | 'edit';
        onFragmentChange: (fragment: string) => void;
        onRevert: () => void;
        onClose: () => void;
      }
    | undefined;
} = { props: undefined };
jest.mock('./trigger_config_panel', () => ({
  TriggerConfigPanel: (props: NonNullable<typeof mockTriggerPanel.props>) => {
    mockTriggerPanel.props = props;
    return <div data-test-subj="mockTriggerConfigPanel" />;
  },
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
    mockStepPanel.props = undefined;
    mockTriggerPanel.props = undefined;
    mockExperimentalFeatures.enabled = true;
    mockUrlState.selectedStepId = undefined;
    mockUrlState.listeners.clear();
  });

  it('renders the canvas with edit actions for a user who can edit', () => {
    renderEditor(yamlWithMessage('one'));

    expect(mockCanvas.props?.edit).toBeDefined();
  });

  describe('with the experimental features off', () => {
    it('is a read-only graph: no insertion, edit or delete actions on the canvas', () => {
      mockExperimentalFeatures.enabled = false;
      renderEditor(yamlWithMessage('one'));

      expect(mockCanvas.props?.edit).toBeUndefined();
    });

    it('still opens a step in its read-only panel', () => {
      mockExperimentalFeatures.enabled = false;
      renderEditor(yamlWithMessage('one'));

      act(() => mockCanvas.props?.onStepSelect?.('first'));

      expect(screen.getByTestId('mockStepConfigPanel')).toBeInTheDocument();
      expect((mockStepPanel.props as { readOnly?: boolean } | undefined)?.readOnly).toBe(true);
    });
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

  describe('a trigger panel', () => {
    const scheduledAction: ActionOption = { id: 'scheduled', label: 'Scheduled', iconType: 'clock' };
    const triggerPanel = () => screen.queryByTestId('mockTriggerConfigPanel');
    const manualTriggerNodeId = () =>
      Object.entries(mockCanvas.props?.transformed?.nodeRefs ?? {}).find(
        ([, ref]) => ref.kind === 'trigger' && ref.triggerIndex === 0
      )?.[0];
    const selectNode = (id: string | undefined) => act(() => mockCanvas.props?.onStepSelect?.(id));
    const pickNewScheduledTrigger = () => {
      act(() => mockCanvas.props?.edit?.onInsert({ mode: 'trigger' }, anchor));
      act(() => mockMenu.props?.onActionSelected(scheduledAction));
    };

    it('adds a picked trigger to the YAML at once, with a panel that can only remove it', () => {
      const { store } = renderEditor(yamlWithMessage('one'));

      pickNewScheduledTrigger();

      expect(selectYamlString(store.getState())).toContain('type: scheduled');
      expect(triggerPanel()).toBeInTheDocument();
      expect(mockTriggerPanel.props?.mode).toBe('insert');
    });

    it('writes every valid change of a new trigger to the YAML', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      pickNewScheduledTrigger();

      act(() => mockTriggerPanel.props?.onFragmentChange('type: scheduled\nwith:\n  every: 2h\n'));

      const yaml = selectYamlString(store.getState());
      expect(yaml).toContain('every: 2h');
      expect(yaml.match(/type: scheduled/g)).toHaveLength(1);
    });

    it('is removed with the panel button, leaving the YAML as it was before it', () => {
      const original = yamlWithMessage('one');
      const { store } = renderEditor(original);
      pickNewScheduledTrigger();
      act(() => mockTriggerPanel.props?.onFragmentChange('type: scheduled\nwith:\n  every: 2h\n'));

      act(() => mockTriggerPanel.props?.onRevert());

      expect(selectYamlString(store.getState())).toBe(original);
      expect(triggerPanel()).not.toBeInTheDocument();
    });

    it('keeps a new trigger as it is edited when the panel is closed or the canvas is clicked', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      pickNewScheduledTrigger();
      act(() => mockTriggerPanel.props?.onFragmentChange('type: scheduled\nwith:\n  every: 2h\n'));

      act(() => mockTriggerPanel.props?.onClose());

      expect(selectYamlString(store.getState())).toContain('every: 2h');
      expect(triggerPanel()).not.toBeInTheDocument();
    });

    it('opens for an existing trigger and applies its edits live', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      selectNode(manualTriggerNodeId());

      expect(triggerPanel()).toBeInTheDocument();
      expect(mockTriggerPanel.props?.mode).toBe('edit');
      act(() =>
        mockTriggerPanel.props?.onFragmentChange(
          'type: manual\ninputs:\n  properties:\n    env:\n      type: string\n'
        )
      );

      expect(selectYamlString(store.getState())).toContain('env:');
    });

    it('keeps an existing trigger as edited when the canvas is clicked', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      selectNode(manualTriggerNodeId());
      act(() =>
        mockTriggerPanel.props?.onFragmentChange(
          'type: manual\ninputs:\n  properties:\n    env:\n      type: string\n'
        )
      );

      selectNode(undefined);

      expect(triggerPanel()).not.toBeInTheDocument();
      expect(selectYamlString(store.getState())).toContain('env:');
    });

    it('is put back as it was when Reset trigger is pressed, which also closes the panel', () => {
      const original = yamlWithMessage('one');
      const { store } = renderEditor(original);
      selectNode(manualTriggerNodeId());
      act(() =>
        mockTriggerPanel.props?.onFragmentChange(
          'type: manual\ninputs:\n  properties:\n    env:\n      type: string\n'
        )
      );

      act(() => mockTriggerPanel.props?.onRevert());

      expect(selectYamlString(store.getState())).toBe(original);
      expect(triggerPanel()).not.toBeInTheDocument();
    });

    it('closes when the YAML is changed from somewhere else, as its place in the list may have moved', () => {
      const original = yamlWithMessage('one');
      const { store } = renderEditor(original);
      selectNode(manualTriggerNodeId());
      expect(triggerPanel()).toBeInTheDocument();

      act(() => {
        store.dispatch(setYamlString(`# edited in the YAML tab\n${original}`));
      });

      expect(triggerPanel()).not.toBeInTheDocument();
    });
  });

  describe('a step panel', () => {
    const selectStep = (id: string) => act(() => mockCanvas.props?.onStepSelect?.(id));
    const firstWith = (message: string) =>
      `name: first\ntype: console\nwith:\n  message: ${message}\n`;

    it('writes every valid change of the open step to the YAML', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      selectStep('first');

      act(() => mockStepPanel.props?.onFragmentChange?.(firstWith('changed')));

      expect(selectYamlString(store.getState())).toContain('message: changed');
    });

    it('hands the panel a change made to the step elsewhere, instead of writing the old draft back', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      selectStep('first');

      act(() => {
        store.dispatch(setYamlString(yamlWithMessage('from the YAML tab')));
      });

      expect(mockStepPanel.props?.syncedFragment?.fragment).toContain('message: from the YAML tab');
      expect(selectYamlString(store.getState())).toContain('message: from the YAML tab');
    });

    it('takes a step that was just added out again with Remove node, restoring the YAML', () => {
      const original = yamlWithMessage('one');
      const { store } = renderEditor(original);
      act(() => mockCanvas.props?.edit?.onInsert({ mode: 'after', stepName: 'first' }, anchor));
      act(() => mockMenu.props?.onActionSelected(consoleAction));
      expect(selectYamlString(store.getState())).toContain('name: console_step');

      act(() => mockStepPanel.props?.onRevert());

      expect(selectYamlString(store.getState())).toBe(original);
    });

    it('removes only the added step when the YAML was changed elsewhere in the meantime', () => {
      const { store } = renderEditor(yamlWithMessage('one'));
      act(() => mockCanvas.props?.edit?.onInsert({ mode: 'after', stepName: 'first' }, anchor));
      act(() => mockMenu.props?.onActionSelected(consoleAction));
      act(() => {
        store.dispatch(setYamlString(`${selectYamlString(store.getState())}# written elsewhere\n`));
      });

      act(() => mockStepPanel.props?.onRevert());

      const yaml = selectYamlString(store.getState());
      expect(yaml).not.toContain('name: console_step');
      expect(yaml).toContain('# written elsewhere');
    });

    it('puts an existing step back as it was with Reset node', () => {
      const original = yamlWithMessage('one');
      const { store } = renderEditor(original);
      selectStep('first');
      act(() => mockStepPanel.props?.onFragmentChange?.(firstWith('changed')));

      act(() => mockStepPanel.props?.onRevert());

      expect(selectYamlString(store.getState())).toBe(original);
    });
  });

  describe('renaming a step', () => {
    const yamlWithReference = `version: "1"
name: Test
enabled: false
triggers:
  - type: manual
steps:
  - name: first
    type: console
    with:
      message: one
  - name: second
    type: console
    if: steps.first.output.ok
    with:
      message: "{{ steps.first.output }}"
`;

    it('rewrites the references to the step in the same write', () => {
      const { store } = renderEditor(yamlWithReference);
      act(() => mockCanvas.props?.onStepSelect?.('first'));

      act(() =>
        mockStepPanel.props?.onFragmentChange?.(
          'name: renamed\ntype: console\nwith:\n  message: one\n'
        )
      );

      const yaml = selectYamlString(store.getState());
      expect(yaml).toContain('name: renamed');
      expect(yaml).toContain('message: "{{ steps.renamed.output }}"');
      expect(yaml).toContain('if: steps.renamed.output.ok');
      expect(yaml).not.toMatch(/steps\.first\b/);
    });
  });
});
