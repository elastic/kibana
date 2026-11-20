/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { render, renderHook } from '@testing-library/react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import { WorkflowGraphBypassLaneNode } from './workflow_graph_bypass_lane_node';
import type { WorkflowBypassLaneData } from './workflow_node_data';

// Spy on Handle: records the props the node passes without needing a React Flow
// store, so handle type / position / visibility can be asserted.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: jest.fn().mockReturnValue(null),
}));

const mockHandle = jest.mocked(Handle);

const makeNodeProps = (
  overrides: Partial<NodeProps<Node<WorkflowBypassLaneData>>> = {},
  data: WorkflowBypassLaneData = {}
): NodeProps<Node<WorkflowBypassLaneData>> => ({
  id: 'bypass-1',
  type: 'bypassLane',
  data,
  selected: false,
  dragging: false,
  draggable: false,
  selectable: false,
  deletable: false,
  isConnectable: false,
  zIndex: 0,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  ...overrides,
});

const renderLane = (
  overrides: Partial<NodeProps<Node<WorkflowBypassLaneData>>> = {},
  data: WorkflowBypassLaneData = {}
) => render(<WorkflowGraphBypassLaneNode {...makeNodeProps(overrides, data)} />);

const handleProps = () => mockHandle.mock.calls.map(([props]) => props);

describe('WorkflowGraphBypassLaneNode', () => {
  beforeEach(() => {
    mockHandle.mockClear();
  });

  it('renders an invisible target handle on top and source handle on the bottom by default', () => {
    renderLane();

    expect(handleProps()).toEqual([
      expect.objectContaining({ type: 'target', position: Position.Top, style: { opacity: 0 } }),
      expect.objectContaining({ type: 'source', position: Position.Bottom, style: { opacity: 0 } }),
    ]);
  });

  it('uses the layout-provided handle positions (LR layouts)', () => {
    renderLane({ targetPosition: Position.Left, sourcePosition: Position.Right });

    const [target, source] = handleProps();
    expect(target).toEqual(expect.objectContaining({ type: 'target', position: Position.Left }));
    expect(source).toEqual(expect.objectContaining({ type: 'source', position: Position.Right }));
  });

  it('renders no interactive output: no buttons, links, focusable or labelled elements', () => {
    const { container } = renderLane();

    expect(
      container.querySelector('button, a, input, [role], [tabindex], [aria-label]')
    ).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('draws a non-interactive 1px bridge line that ignores pointer events', () => {
    const { container } = renderLane();

    const bridge = container.firstElementChild;
    expect(container.children).toHaveLength(1);
    expect(bridge).toHaveStyle({ width: '1px', pointerEvents: 'none' });
  });

  it('tints the bridge with the success token only when the empty branch was traversed', () => {
    const { result } = renderHook(() => useEuiTheme());
    const { success, borderBaseProminent } = result.current.euiTheme.colors;

    const idle = renderLane({}, { traversed: false });
    expect(idle.container.firstElementChild).toHaveStyle({ background: borderBaseProminent });
    idle.unmount();

    const omitted = renderLane({}, {});
    expect(omitted.container.firstElementChild).toHaveStyle({ background: borderBaseProminent });
    omitted.unmount();

    const traversed = renderLane({}, { traversed: true });
    expect(traversed.container.firstElementChild).toHaveStyle({ background: success });
  });
});
