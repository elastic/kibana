/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import type { WorkflowYaml } from '@kbn/workflows';
import type { InsertionPoints } from './compute_insertion_points';
import type { WorkflowGraphEditActions } from './workflow_graph_actions_context';
import { WorkflowGraphCanvasWithoutProvider } from './workflow_graph_canvas';

jest.mock('./ensure_eui_icons', () => ({ ensureWorkflowGraphEuiIcons: jest.fn() }));

const mockNodes = [
  { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, width: 200, height: 64, data: {} },
  { id: 'step1', type: 'step', position: { x: 0, y: 150 }, width: 200, height: 64, data: {} },
];

jest.mock('./use_workflow_layout', () => ({
  useWorkflowLayout: () => ({
    nodes: mockNodes,
    edges: [],
    transformed: { nodeRefs: {}, edges: [], nodes: [], forkNodeToJoinId: new Map() },
  }),
}));

// Insertion points are derived from the YAML by `computeInsertionPoints`; the
// shortcut only consumes them, so tests drive them directly.
let mockInsertionPoints: InsertionPoints;
jest.mock('./compute_insertion_points', () => ({
  ...jest.requireActual('./compute_insertion_points'),
  computeInsertionPoints: () => mockInsertionPoints,
}));

// The overlays are not under test here (and need a live React Flow store).
jest.mock('./workflow_graph_edit_overlays', () => ({
  WorkflowGraphEditOverlays: () => null,
  WorkflowGraphEmptyAddTrigger: () => null,
}));

let mockCapturedReactFlowProps: Record<string, unknown> | undefined;
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ReactFlow: ({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }) => {
    mockCapturedReactFlowProps = rest;
    return <div data-test-subj="reactflow-mock">{children}</div>;
  },
  Background: () => null,
  MiniMap: () => null,
  Panel: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  Handle: () => null,
  useReactFlow: () => ({
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  }),
  useStore: (selector: (s: { width: number; height: number }) => unknown) =>
    selector({ width: 0, height: 0 }),
  useNodesInitialized: () => false,
  ViewportPortal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const workflow: WorkflowYaml = {
  version: '1',
  name: 'wf',
  enabled: true,
  triggers: [{ type: 'manual' }],
  steps: [{ name: 'step1', type: 'console', with: { message: 'hi' } }],
};

const makeEdit = (): jest.Mocked<WorkflowGraphEditActions> => ({
  onInsert: jest.fn(),
  onEditStep: jest.fn(),
  onDeleteNode: jest.fn(),
});

const ZERO_ANCHOR = { left: 0, top: 0, width: 0, height: 0 };

/** Trunk of two top-level steps (`step1` → `step2`, the terminal) plus a nested `inner` step. */
const makeInsertionPoints = (): InsertionPoints => ({
  byNodeId: new Map([
    ['step1', { step: { sourceNodeId: 'step1', stepName: 'step1', isTerminal: false } }],
    ['step2', { step: { sourceNodeId: 'step2', stepName: 'step2', isTerminal: true } }],
    ['inner', { step: { sourceNodeId: 'inner', stepName: 'inner', isTerminal: true } }],
  ]),
  topLevelStepNodeIds: ['step1', 'step2'],
});

const baseProps = { workflow, isYamlValid: true, onStepSelect: jest.fn() } as const;

beforeEach(() => {
  mockCapturedReactFlowProps = undefined;
  mockInsertionPoints = makeInsertionPoints();
});

describe('WorkflowGraphCanvas Cmd/Ctrl+K append shortcut', () => {
  /** Dispatches a keydown from `target` (bubbles to window); returns false when default was prevented. */
  const pressKey = (init: KeyboardEventInit, target: Element | Window = window): boolean =>
    fireEvent.keyDown(target, init);

  it('appends after the trunk terminal on Ctrl+K and prevents the browser default', () => {
    const edit = makeEdit();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);

    const notPrevented = pressKey({ key: 'k', ctrlKey: true });

    expect(edit.onInsert).toHaveBeenCalledTimes(1);
    expect(edit.onInsert).toHaveBeenCalledWith({ mode: 'after', stepName: 'step2' }, ZERO_ANCHOR);
    expect(notPrevented).toBe(false);
  });

  it('also fires on Cmd+K and for an upper-case key (Caps Lock / Shift)', () => {
    const edit = makeEdit();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);

    pressKey({ key: 'k', metaKey: true });
    pressKey({ key: 'K', ctrlKey: true });

    expect(edit.onInsert).toHaveBeenCalledTimes(2);
  });

  it('appends directly after a selected nested step', () => {
    const edit = makeEdit();
    render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} selectedStepId="inner" />
    );

    pressKey({ key: 'k', ctrlKey: true });

    expect(edit.onInsert).toHaveBeenCalledWith({ mode: 'after', stepName: 'inner' }, ZERO_ANCHOR);
  });

  it('does nothing and leaves the default alone when the canvas is not in edit mode', () => {
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} />);

    const notPrevented = pressKey({ key: 'k', ctrlKey: true });

    expect(notPrevented).toBe(true);
  });

  it('does nothing while insertion controls are suppressed (config panel open)', () => {
    const edit = makeEdit();
    render(
      <WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} suppressInsertionControls />
    );

    const notPrevented = pressKey({ key: 'k', ctrlKey: true });

    expect(edit.onInsert).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it.each<[string, Pick<KeyboardEventInit, 'key' | 'ctrlKey' | 'metaKey'>]>([
    ['K without a modifier', { key: 'k' }],
    ['a different key with Ctrl', { key: 'j', ctrlKey: true }],
    ['a different key with Cmd', { key: 'p', metaKey: true }],
  ])('ignores %s', (_label, init) => {
    const edit = makeEdit();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);

    const notPrevented = pressKey(init);

    expect(edit.onInsert).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  describe('keystrokes from editable targets', () => {
    let host: HTMLElement;
    beforeEach(() => {
      host = document.createElement('div');
      document.body.appendChild(host);
    });
    afterEach(() => host.remove());

    const expectIgnored = (target: Element) => {
      const edit = makeEdit();
      render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);

      const notPrevented = pressKey({ key: 'k', ctrlKey: true }, target);

      expect(edit.onInsert).not.toHaveBeenCalled();
      expect(notPrevented).toBe(true);
    };

    it('ignores keystrokes originating in an input', () => {
      const input = document.createElement('input');
      host.appendChild(input);
      expectIgnored(input);
    });

    it('ignores keystrokes originating in a textarea', () => {
      const textarea = document.createElement('textarea');
      host.appendChild(textarea);
      expectIgnored(textarea);
    });

    it('ignores keystrokes originating in a contenteditable element', () => {
      const editable = document.createElement('div');
      // jsdom does not implement `isContentEditable`; browsers derive it from the attribute.
      Object.defineProperty(editable, 'isContentEditable', { value: true });
      host.appendChild(editable);
      expectIgnored(editable);
    });

    it('ignores keystrokes originating inside a Monaco editor', () => {
      const monaco = document.createElement('div');
      monaco.className = 'monaco-editor';
      const inner = document.createElement('span');
      monaco.appendChild(inner);
      host.appendChild(monaco);
      expectIgnored(inner);
    });

    it('still fires for keystrokes from a non-editable element such as a button', () => {
      const button = document.createElement('button');
      host.appendChild(button);
      const edit = makeEdit();
      render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);

      const notPrevented = pressKey({ key: 'k', ctrlKey: true }, button);

      expect(edit.onInsert).toHaveBeenCalledTimes(1);
      expect(notPrevented).toBe(false);
    });
  });

  it('neither inserts nor prevents the default when the workflow has no append target', () => {
    mockInsertionPoints = { byNodeId: new Map(), topLevelStepNodeIds: [] };
    const edit = makeEdit();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);

    const notPrevented = pressKey({ key: 'k', ctrlKey: true });

    expect(edit.onInsert).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it('stops listening once the canvas unmounts', () => {
    const edit = makeEdit();
    const { unmount } = render(<WorkflowGraphCanvasWithoutProvider {...baseProps} edit={edit} />);
    unmount();

    pressKey({ key: 'k', ctrlKey: true });

    expect(edit.onInsert).not.toHaveBeenCalled();
  });
});

describe('WorkflowGraphCanvas pane click', () => {
  const clickPane = () => {
    const onPaneClick = mockCapturedReactFlowProps?.onPaneClick;
    if (typeof onPaneClick !== 'function') throw new Error('onPaneClick was not wired');
    act(() => onPaneClick({}));
  };

  const settingsNodes = { workflowName: 'wf', constantsCount: 0, outputsCount: 0 } as const;

  it('clears the step selection when a step is selected', () => {
    const onStepSelect = jest.fn();
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        onStepSelect={onStepSelect}
        selectedStepId="step1"
      />
    );

    clickPane();

    expect(onStepSelect).toHaveBeenCalledTimes(1);
    expect(onStepSelect).toHaveBeenCalledWith(undefined);
  });

  it('does not call onStepSelect when no step is selected', () => {
    const onStepSelect = jest.fn();
    render(<WorkflowGraphCanvasWithoutProvider {...baseProps} onStepSelect={onStepSelect} />);

    clickPane();

    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it('clears the settings selection when a settings node is selected', () => {
    const onStepSelect = jest.fn();
    const onSettingsNodeSelect = jest.fn();
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        onStepSelect={onStepSelect}
        onSettingsNodeSelect={onSettingsNodeSelect}
        settingsNodes={{ ...settingsNodes, selectedKind: 'constants' }}
      />
    );

    clickPane();

    expect(onSettingsNodeSelect).toHaveBeenCalledTimes(1);
    expect(onSettingsNodeSelect).toHaveBeenCalledWith(undefined);
    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it('does not touch the settings selection when none is selected', () => {
    const onSettingsNodeSelect = jest.fn();
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        onSettingsNodeSelect={onSettingsNodeSelect}
        settingsNodes={settingsNodes}
      />
    );

    clickPane();

    expect(onSettingsNodeSelect).not.toHaveBeenCalled();
  });

  it('clears both selections when a step and a settings node are selected', () => {
    const onStepSelect = jest.fn();
    const onSettingsNodeSelect = jest.fn();
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        onStepSelect={onStepSelect}
        onSettingsNodeSelect={onSettingsNodeSelect}
        selectedStepId="step1"
        settingsNodes={{ ...settingsNodes, selectedKind: 'info' }}
      />
    );

    clickPane();

    expect(onStepSelect).toHaveBeenCalledWith(undefined);
    expect(onSettingsNodeSelect).toHaveBeenCalledWith(undefined);
  });

  it('tolerates a missing onSettingsNodeSelect while a settings kind is selected', () => {
    render(
      <WorkflowGraphCanvasWithoutProvider
        {...baseProps}
        settingsNodes={{ ...settingsNodes, selectedKind: 'outputs' }}
      />
    );

    expect(() => clickPane()).not.toThrow();
  });
});
