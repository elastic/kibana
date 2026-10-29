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
import { ExecutionStatus } from '@kbn/workflows';
import { ERROR_PORT_ALONG } from './port_geometry';
import {
  type WorkflowGraphActions,
  WorkflowGraphActionsContext,
} from './workflow_graph_actions_context';
import {
  resolveNodeColors,
  WorkflowGraphNode,
  type WorkflowGraphNodeData,
} from './workflow_graph_node';

// Stub @xyflow/react's Handle — it requires an internal React Flow context that
// isn't available in unit tests, and we're not testing connection logic here.
// Renders its id/style as a queryable element so geometry (e.g. the fallback
// port's along-edge position) can still be asserted without the real context.
const mockUpdateNodeInternals = jest.fn();
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: ({ id, style }: { id?: string; style?: React.CSSProperties }) => (
    <div data-testid={`handle-${id ?? 'default'}`} style={style} />
  ),
  Position: { Top: 'top', Bottom: 'bottom' },
  // Real impl needs a ReactFlowProvider the unit test doesn't set up.
  useUpdateNodeInternals: () => mockUpdateNodeInternals,
}));

// Minimal NodeProps-shaped object for `WorkflowGraphNode`.
const makeNodeProps = (
  data: Partial<WorkflowGraphNodeData> = {},
  selected = false
): Parameters<typeof WorkflowGraphNode>[0] =>
  ({
    id: 'node-1',
    type: 'step',
    data: {
      label: 'Test Step',
      stepType: 'http',
      ...data,
    },
    selected,
    dragging: false,
    isConnectable: false,
    zIndex: 0,
    xPos: 0,
    yPos: 0,
    targetPosition: 'top' as any,
    sourcePosition: 'bottom' as any,
  } as any);

const renderNode = (
  data: Partial<WorkflowGraphNodeData> = {},
  selected = false,
  actions: WorkflowGraphActions = {}
) =>
  render(
    <WorkflowGraphActionsContext.Provider value={actions}>
      <WorkflowGraphNode {...makeNodeProps(data, selected)} />
    </WorkflowGraphActionsContext.Provider>
  );

describe('WorkflowGraphNode', () => {
  it('renders the deslugified step label in the accessible name', () => {
    renderNode({ label: 'my-step', stepType: 'http' });
    expect(screen.getByRole('button', { name: /My Step/ })).toBeInTheDocument();
  });

  it('includes the stepType in the accessible name', () => {
    renderNode({ label: 'fetch-data', stepType: 'elasticsearch' });
    expect(screen.getByRole('button', { name: /Fetch Data/ })).toBeInTheDocument();
  });

  it('shows "Completed successfully" status label on success', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.COMPLETED,
      } as any,
    });
    expect(screen.getByLabelText('Completed successfully')).toBeInTheDocument();
  });

  it('shows "Failed" status label on failure', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.FAILED,
      } as any,
    });
    expect(screen.getByLabelText('Failed')).toBeInTheDocument();
  });

  it('shows "Failed" status label on TIMED_OUT', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.TIMED_OUT,
      } as any,
    });
    expect(screen.getByLabelText('Failed')).toBeInTheDocument();
  });

  it('shows "Running" status label for RUNNING', () => {
    renderNode({
      stepExecution: {
        id: 'e1',
        stepId: 'node-1',
        status: ExecutionStatus.RUNNING,
      } as any,
    });
    expect(screen.getByLabelText('Running')).toBeInTheDocument();
  });

  it('shows retry failure badge when step has retry max-attempts', () => {
    renderNode({
      step: { retry: { 'max-attempts': 3 } },
    });
    // Always visible at rest — not gated on node hover.
    expect(screen.getByTestId('workflowGraphNodeFailureBadge')).toBeInTheDocument();
    expect(screen.getByTestId('workflowGraphNodeFailureBadgeAttempts')).toHaveTextContent('3');
  });

  it('shows retry failure badge from on-failure.retry', () => {
    renderNode({
      step: { 'on-failure': { retry: { 'max-attempts': 2 } } },
    });
    expect(screen.getByTestId('workflowGraphNodeFailureBadgeAttempts')).toHaveTextContent('2');
  });

  it('does NOT show failure badge when neither retry nor continue is set', () => {
    renderNode({ step: {} });
    expect(screen.queryByTestId('workflowGraphNodeFailureBadge')).toBeNull();
  });

  it('shows continue failure badge when on-failure.continue is true', () => {
    renderNode({
      step: { 'on-failure': { continue: true } },
    });
    expect(screen.getByTestId('workflowGraphNodeFailureBadge')).toHaveAttribute(
      'aria-label',
      'The workflow continues if this step fails'
    );
  });

  it('shows combined failure badge when retry and continue are both configured', () => {
    renderNode({
      step: { 'on-failure': { retry: { 'max-attempts': 10 }, continue: true } },
    });
    expect(screen.getByTestId('workflowGraphNodeFailureBadgeAttempts')).toHaveTextContent('10');
    expect(screen.getByTestId('workflowGraphNodeFailureBadge').getAttribute('aria-label')).toMatch(
      /continues if it still fails/
    );
  });

  it('shows retry-only failure badge when continue is false', () => {
    renderNode({
      step: { 'on-failure': { continue: false, retry: { 'max-attempts': 2 } } },
    });
    expect(screen.getByTestId('workflowGraphNodeFailureBadgeAttempts')).toHaveTextContent('2');
    expect(screen.getByTestId('workflowGraphNodeFailureBadge').getAttribute('aria-label')).toMatch(
      /stops if it still fails/
    );
  });

  it('does not show run action in read-only mode', () => {
    renderNode({}, false, { onStepRun: jest.fn(), canRunSteps: false });

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Test Step/ }));

    expect(screen.queryByTestId('workflowGraphNodeRunStep')).toBeNull();
  });

  it('shows run action when step runs are enabled', () => {
    renderNode({}, false, { onStepRun: jest.fn(), canRunSteps: true });

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Test Step/ }));

    expect(screen.getByTestId('workflowGraphNodeRunStep')).toBeInTheDocument();
  });

  it('calls onStepSelect with the node id when Enter is pressed', () => {
    const onStepSelect = jest.fn();
    renderNode({}, false, { onStepSelect });

    const node = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(node, { key: 'Enter' });
    expect(onStepSelect).toHaveBeenCalledWith('node-1');
  });

  it('lets a card click bubble to the React Flow node wrapper instead of selecting itself', () => {
    const onStepSelect = jest.fn();
    const onWrapperClick = jest.fn();
    render(
      <div role="presentation" onClick={onWrapperClick}>
        <WorkflowGraphActionsContext.Provider value={{ onStepSelect }}>
          <WorkflowGraphNode {...makeNodeProps()} />
        </WorkflowGraphActionsContext.Provider>
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /Test Step/ }));

    // Selection is driven by React Flow's onNodeClick, so the card must neither
    // swallow the click nor select on its own (that would double-select).
    expect(onWrapperClick).toHaveBeenCalledTimes(1);
    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it('calls onStepSelect with the node id when Space is pressed', () => {
    const onStepSelect = jest.fn();
    renderNode({}, false, { onStepSelect });

    const node = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(node, { key: ' ' });
    expect(onStepSelect).toHaveBeenCalledWith('node-1');
  });

  it('does not call onStepSelect on other key presses', () => {
    const onStepSelect = jest.fn();
    renderNode({}, false, { onStepSelect });

    const node = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(node, { key: 'Escape' });
    expect(onStepSelect).not.toHaveBeenCalled();
  });

  it('includes execution status in the accessible name when an execution exists', () => {
    renderNode({
      label: 'step-x',
      stepExecution: {
        id: 'e2',
        stepId: 'node-1',
        status: ExecutionStatus.FAILED,
      } as any,
    });
    const node = screen.getByRole('button');
    expect(node.getAttribute('aria-label')).toContain(ExecutionStatus.FAILED);
  });

  it('reads the accessible name as "<type> step: <label>, status: <status>" with an execution', () => {
    renderNode({
      label: 'Fetch Data',
      stepType: 'http',
      stepExecution: {
        id: 'e3',
        stepId: 'node-1',
        status: ExecutionStatus.COMPLETED,
      } as any,
    });
    expect(
      screen.getByRole('button', { name: 'http step: Fetch Data, status: completed' })
    ).toBeInTheDocument();
  });

  it('reads the accessible name as "<type> step: <label>" without an execution', () => {
    renderNode({ label: 'Fetch Data', stepType: 'http' });
    expect(screen.getByRole('button', { name: 'http step: Fetch Data' })).toBeInTheDocument();
  });

  it('renders a compact preview without the step label text', () => {
    const { queryByTitle } = renderNode({ label: 'hidden-label', preview: true });
    // In preview mode the outer div is an aria-label'd div, not a role=button,
    // and there is no label text rendered as a <span>.
    expect(queryByTitle('hidden-label')).toBeNull();
  });

  it('labels the compact preview card as "<type>: <label>"', () => {
    const { container } = renderNode({ label: 'My Label', stepType: 'http', preview: true });
    expect(container.querySelector('[aria-label="http: My Label"]')).not.toBeNull();
  });
});

describe('resolveNodeColors', () => {
  const theme = {
    colors: {
      backgroundBaseAccent: 'accent-bg',
      borderBaseAccent: 'accent-border',
      textAccent: 'accent-text',
      backgroundBaseAccentSecondary: 'flow-bg',
      borderBaseAccentSecondary: 'flow-border',
      textAccentSecondary: 'flow-text',
      backgroundBaseWarning: 'data-bg',
      borderBaseWarning: 'data-border',
      textWarning: 'data-text',
      backgroundBasePrimary: 'code-bg',
      borderBasePrimary: 'code-border',
      textPrimary: 'code-text',
      backgroundBaseSubdued: 'neutral-bg',
      borderBaseSubdued: 'neutral-border',
      textSubdued: 'neutral-text',
      backgroundBaseSuccess: 'success-bg',
      borderBaseSuccess: 'success-border',
      textSuccess: 'success-text',
      backgroundBaseDanger: 'danger-bg',
      borderBaseDanger: 'danger-border',
      textDanger: 'danger-text',
      borderBasePlain: 'plain-border',
      textHeading: 'heading-color',
      success: 'success-color',
      danger: 'danger-color',
    },
    border: {
      radius: {
        medium: 'medium-radius',
        small: 'small-radius',
        inline: 'inline-radius',
        control: 'control-radius',
        panel: 'panel-radius',
        frame: 'frame-radius',
      },
    },
  } as any;

  const idle = { isRunning: false, isSuccess: false, isFailed: false };
  const running = { isRunning: true, isSuccess: false, isFailed: false };
  const success = { isRunning: false, isSuccess: true, isFailed: false };
  const failed = { isRunning: false, isSuccess: false, isFailed: true };

  it('uses a plain panel border when idle', () => {
    expect(resolveNodeColors(theme, 'http', false, idle).panelBorder).toBe('plain-border');
    expect(resolveNodeColors(theme, 'manual', true, idle).panelBorder).toBe('plain-border');
  });

  it('uses the success color token for the panel border on success', () => {
    expect(resolveNodeColors(theme, 'http', false, success).panelBorder).toBe('success-color');
    expect(resolveNodeColors(theme, 'elasticsearch.search', false, success).panelBorder).toBe(
      'success-color'
    );
  });

  it('uses the danger color token for the panel border on failure', () => {
    expect(resolveNodeColors(theme, 'if', false, failed).panelBorder).toBe('danger-color');
  });

  it('recolors category chips on success and failure', () => {
    const completed = resolveNodeColors(theme, 'if', false, success);
    expect(completed.chipBackground).toBe('success-bg');
    expect(completed.chipBorder).toBe('success-color');
    expect(completed.chipIconColor).toBe('success-color');

    const errored = resolveNodeColors(theme, 'console', false, failed);
    expect(errored.chipBackground).toBe('danger-bg');
    expect(errored.chipBorder).toBe('danger-color');
    expect(errored.chipIconColor).toBe('danger-color');
  });

  it('recolors brand tiles on execution outcome but leaves the logo untinted', () => {
    const completed = resolveNodeColors(theme, 'elasticsearch.search', false, success);
    expect(completed.isBrandChip).toBe(true);
    expect(completed.chipBackground).toBe('success-bg');
    expect(completed.chipBorder).toBe('success-color');
    expect(completed.chipIconColor).toBeUndefined();
  });

  it('uses trigger chip tokens when idle', () => {
    const { chipBackground, chipIconColor, isBrandChip } = resolveNodeColors(
      theme,
      'manual',
      true,
      idle
    );
    expect(chipBackground).toBe('accent-bg');
    expect(chipIconColor).toBe('accent-text');
    expect(isBrandChip).toBe(false);
  });

  describe('hasStatusIcon', () => {
    it('is true when running, completed, or failed', () => {
      expect(resolveNodeColors(theme, 'http', false, running).hasStatusIcon).toBe(true);
      expect(resolveNodeColors(theme, 'http', false, success).hasStatusIcon).toBe(true);
      expect(resolveNodeColors(theme, 'http', false, failed).hasStatusIcon).toBe(true);
    });

    it('is false when idle', () => {
      expect(resolveNodeColors(theme, 'http', false, idle).hasStatusIcon).toBe(false);
    });
  });
});

describe('WorkflowGraphNode — edit mode', () => {
  const makeEdit = () => ({
    onInsert: jest.fn(),
    onEditStep: jest.fn(),
    onDeleteNode: jest.fn(),
  });

  it('renders no action cluster in read-only mode', () => {
    renderNode();
    expect(screen.queryByTestId('workflowGraphNodeActionCluster')).not.toBeInTheDocument();
  });

  it('renders the node action cluster in edit mode', () => {
    renderNode({}, false, { edit: makeEdit() });
    expect(screen.getByTestId('workflowGraphNodeActionCluster')).toBeInTheDocument();
  });

  it('closes the step actions menu when clicking away', () => {
    renderNode({}, false, { edit: makeEdit() });
    const menuButton = screen.getByTestId('workflowGraphNodeMenuButton');
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('workflowGraphNodeMenuPanel')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the step actions menu on right-click in edit mode', () => {
    renderNode({}, false, { edit: makeEdit() });
    const card = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.contextMenu(card, { clientX: 140, clientY: 90 });
    expect(screen.getByTestId('workflowGraphNodeMenuButton')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('workflowGraphNodeMenuPanel')).toBeInTheDocument();
    const anchor = screen.getByTestId('workflowGraphNodeContextMenuAnchor');
    expect(anchor).toHaveStyle({ left: '140px', top: '90px' });
  });

  it('does not open a menu on right-click in read-only mode', () => {
    renderNode();
    fireEvent.contextMenu(screen.getByRole('button', { name: /Test Step/ }), {
      clientX: 10,
      clientY: 10,
    });
    expect(screen.queryByTestId('workflowGraphNodeMenuPanel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowGraphNodeContextMenuAnchor')).not.toBeInTheDocument();
  });

  it('does not bubble clicks from the action cluster to the node wrapper', () => {
    const onWrapperClick = jest.fn();
    render(
      <div role="presentation" onClick={onWrapperClick}>
        <WorkflowGraphActionsContext.Provider value={{ edit: makeEdit() }}>
          <WorkflowGraphNode {...makeNodeProps()} />
        </WorkflowGraphActionsContext.Provider>
      </div>
    );

    fireEvent.click(screen.getByTestId('workflowGraphNodeMenuButton'));

    expect(onWrapperClick).not.toHaveBeenCalled();
  });

  it('does not bubble clicks from the run button to the node wrapper', () => {
    const onWrapperClick = jest.fn();
    const onStepRun = jest.fn();
    render(
      <div role="presentation" onClick={onWrapperClick}>
        <WorkflowGraphActionsContext.Provider value={{ canRunSteps: true, onStepRun }}>
          <WorkflowGraphNode {...makeNodeProps()} />
        </WorkflowGraphActionsContext.Provider>
      </div>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Test Step/ }));
    fireEvent.click(screen.getByTestId('workflowGraphNodeRunStep'));

    expect(onStepRun).toHaveBeenCalledTimes(1);
    expect(onWrapperClick).not.toHaveBeenCalled();
  });

  it('anchors the ⋯ menu to the button, not a cursor position', () => {
    renderNode({}, false, { edit: makeEdit() });
    fireEvent.click(screen.getByTestId('workflowGraphNodeMenuButton'));
    expect(screen.getByTestId('workflowGraphNodeMenuPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowGraphNodeContextMenuAnchor')).not.toBeInTheDocument();
  });

  it('positions the fallback source handle at ERROR_PORT_ALONG, matching the red anchor', () => {
    const { container } = renderNode({
      step: { 'on-failure': { fallback: [{ name: 'fb', type: 'console' }] } },
    });
    // `data-testid` here (not Kibana's `data-test-subj`) — see the Handle mock above.
    const handle = container.querySelector('[data-testid="handle-fallback"]') as HTMLElement;
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveStyle({ left: ERROR_PORT_ALONG });
    expect(handle.style.right).toBe('');
  });

  it('tells React Flow to re-measure the node when a fallback is added', () => {
    // The `fallback` Handle only mounts once `hasFallback` is true. React Flow
    // measures a node's handles once and won't notice one added later without
    // a resize — so a freshly-added fallback edge fails to resolve its source
    // handle until something calls `updateNodeInternals` for this node.
    mockUpdateNodeInternals.mockClear();
    const { rerender } = renderNode({});
    // React Flow measures a freshly mounted node itself — no redundant call.
    expect(mockUpdateNodeInternals).not.toHaveBeenCalled();

    rerender(
      <WorkflowGraphActionsContext.Provider value={{}}>
        <WorkflowGraphNode
          {...makeNodeProps({
            step: { 'on-failure': { fallback: [{ name: 'fb', type: 'console' }] } },
          })}
        />
      </WorkflowGraphActionsContext.Provider>
    );
    expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1');
  });

  it('re-measures on mount when the fallback handle is already present', () => {
    mockUpdateNodeInternals.mockClear();
    renderNode({ step: { 'on-failure': { fallback: [{ name: 'fb', type: 'console' }] } } });
    expect(mockUpdateNodeInternals).toHaveBeenCalledWith('node-1');
  });

  it('draws a solid border for fallback nodes (no dashed styling)', () => {
    renderNode({ fallbackOf: 'fetch' }, false, { edit: makeEdit() });
    const card = screen.getByRole('button', { name: /Test Step/ });
    expect(getComputedStyle(card).borderStyle).toBe('solid');
  });

  it('keeps a thin border and draws an outer primary ring when selected', () => {
    renderNode({}, true, { edit: makeEdit() });
    const card = screen.getByRole('button', { name: /Test Step/ });
    // Selection uses an outer ::after ring, so the card border stays thin.
    expect(getComputedStyle(card).borderStyle).toBe('solid');
    expect(getComputedStyle(card).borderWidth).not.toBe('2px');
  });

  it('deletes on Delete / Backspace and selects on Enter', () => {
    const edit = makeEdit();
    const onStepSelect = jest.fn();
    renderNode({}, false, { edit, onStepSelect });
    const card = screen.getByRole('button', { name: /Test Step/ });
    fireEvent.keyDown(card, { key: 'Delete' });
    expect(edit.onDeleteNode).toHaveBeenCalledWith('node-1');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onStepSelect).toHaveBeenCalledWith('node-1');
  });

  it('shows the incomplete warning at the top-right for flagged nodes and never tints the border', () => {
    const { unmount } = renderNode({ configWarning: 'incomplete' }, false, {
      edit: makeEdit(),
    });
    const warning = screen.getByTestId('workflowGraphNodeIncomplete');
    expect(warning).toHaveAttribute('aria-label', 'Incomplete — required fields are missing');
    // Corner placement lives on the EuiToolTip anchor so the tooltip caret
    // tracks the badge, not a collapsed in-flow wrapper.
    expect(getComputedStyle(warning.parentElement!).position).toBe('absolute');
    expect(getComputedStyle(screen.getByRole('button', { name: /Test Step/ })).borderStyle).toBe(
      'solid'
    );
    unmount();
    renderNode({}, false, { edit: makeEdit() });
    expect(screen.queryByTestId('workflowGraphNodeIncomplete')).not.toBeInTheDocument();
  });

  it('uses misconfigured tooltip copy when the applied state is invalid', () => {
    renderNode({ configWarning: 'misconfigured' }, false, { edit: makeEdit() });
    expect(screen.getByTestId('workflowGraphNodeIncomplete')).toHaveAttribute(
      'aria-label',
      'Misconfigured — some fields have invalid values'
    );
  });
});

describe('WorkflowGraphNode render stability', () => {
  const edit = { onInsert: jest.fn(), onEditStep: jest.fn(), onDeleteNode: jest.fn() };

  const keyframeRuleCount = (): number =>
    Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule) => rule.constructor.name === 'CSSKeyframesRule').length;

  it('does not re-render the card on pointer hover or focus movement', () => {
    const renderStepIcon = jest.fn(() => <span />);
    render(
      <WorkflowGraphActionsContext.Provider value={{ edit, renderStepIcon }}>
        <WorkflowGraphNode {...makeNodeProps()} />
      </WorkflowGraphActionsContext.Provider>
    );
    const card = screen.getByRole('button', { name: /Test Step/ });
    const rendersAtRest = renderStepIcon.mock.calls.length;

    fireEvent.mouseEnter(card);
    fireEvent.focus(card);
    fireEvent.blur(card);
    fireEvent.mouseLeave(card);

    expect(renderStepIcon).toHaveBeenCalledTimes(rendersAtRest);
  });

  it('keeps trailing actions mounted and reveals them from card hover / focus-within CSS', () => {
    renderNode({}, false, { edit });
    const trailing = screen.getByTestId('workflowGraphNodeTrailingActions');
    expect(getComputedStyle(trailing).opacity).toBe('0');
    expect(getComputedStyle(trailing).pointerEvents).toBe('none');

    const selectors = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .map((rule) => (rule instanceof CSSStyleRule ? rule.selectorText : ''));
    expect(
      selectors.some((selector) => /:hover\s*>\s*\.workflowGraphNodeTrailingActions/.test(selector))
    ).toBe(true);
    expect(
      selectors.some((selector) =>
        /:focus-within\s*>\s*\.workflowGraphNodeTrailingActions/.test(selector)
      )
    ).toBe(true);
  });

  it('reveals trailing actions when selected or while the menu is open', () => {
    const { unmount } = renderNode({}, true, { edit });
    expect(getComputedStyle(screen.getByTestId('workflowGraphNodeTrailingActions')).opacity).toBe(
      '1'
    );
    unmount();

    renderNode({}, false, { edit });
    fireEvent.click(screen.getByTestId('workflowGraphNodeMenuButton'));
    expect(getComputedStyle(screen.getByTestId('workflowGraphNodeTrailingActions')).opacity).toBe(
      '1'
    );
  });

  it('shares one insert-flash keyframes definition across renders and nodes', () => {
    const { rerender } = renderNode({ flash: true });
    const afterFirst = keyframeRuleCount();
    expect(afterFirst).toBeGreaterThan(0);

    rerender(
      <WorkflowGraphActionsContext.Provider value={{ edit }}>
        <WorkflowGraphNode {...makeNodeProps({ flash: true, label: 'Other' })} />
      </WorkflowGraphActionsContext.Provider>
    );
    renderNode({ flash: true, label: 'Third' });

    expect(keyframeRuleCount()).toBe(afterFirst);
  });

  it('skips re-rendering when only another node-level value changes elsewhere', () => {
    const renderStepIcon = jest.fn(() => <span />);
    const actions = { renderStepIcon };
    const portTargets = { fallbackTarget: { stepName: 'a', nodeId: 'node-1' } };
    const { rerender } = render(
      <WorkflowGraphActionsContext.Provider value={actions}>
        <WorkflowGraphNode {...makeNodeProps({ portTargets })} />
      </WorkflowGraphActionsContext.Provider>
    );
    const rendersAtRest = renderStepIcon.mock.calls.length;

    // Same own values, fresh data object: the memo comparator must hold.
    rerender(
      <WorkflowGraphActionsContext.Provider value={actions}>
        <WorkflowGraphNode {...makeNodeProps({ portTargets })} />
      </WorkflowGraphActionsContext.Provider>
    );
    expect(renderStepIcon).toHaveBeenCalledTimes(rendersAtRest);

    // A changed own value does render.
    rerender(
      <WorkflowGraphActionsContext.Provider value={actions}>
        <WorkflowGraphNode {...makeNodeProps({ portTargets, configWarning: 'incomplete' })} />
      </WorkflowGraphActionsContext.Provider>
    );
    expect(renderStepIcon.mock.calls.length).toBeGreaterThan(rendersAtRest);
  });
});
