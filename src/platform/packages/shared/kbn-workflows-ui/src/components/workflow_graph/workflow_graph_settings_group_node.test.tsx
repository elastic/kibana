/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import { SETTINGS_GROUP_HEADER_HEIGHT } from './build_settings_nodes';
import {
  WorkflowGraphSettingsGroupNode,
  type WorkflowGraphSettingsGroupNodeData,
} from './workflow_graph_settings_group_node';

const makeNodeProps = (
  data: WorkflowGraphSettingsGroupNodeData = {}
): NodeProps<Node<WorkflowGraphSettingsGroupNodeData>> => ({
  id: 'settings:group',
  type: 'settingsGroup',
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
});

const renderGroup = (data: WorkflowGraphSettingsGroupNodeData = {}) =>
  render(<WorkflowGraphSettingsGroupNode {...makeNodeProps(data)} />);

describe('WorkflowGraphSettingsGroupNode', () => {
  it('renders the "Workflow settings" header inside the backdrop', () => {
    renderGroup();

    expect(screen.getByTestId('workflowGraphSettingsGroup')).toHaveTextContent('Workflow settings');
  });

  it('is a purely decorative backdrop: hidden from assistive tech and ignoring pointer events', () => {
    renderGroup();
    const group = screen.getByTestId('workflowGraphSettingsGroup');

    expect(group).toHaveAttribute('aria-hidden', 'true');
    expect(group).toHaveStyle({ pointerEvents: 'none' });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(group.querySelector('[tabindex]')).toBeNull();
  });

  it('fills the node box and reserves the shared header height', () => {
    renderGroup();
    const group = screen.getByTestId('workflowGraphSettingsGroup');

    expect(group).toHaveStyle({ width: '100%', height: '100%' });
    expect(group.firstElementChild).toHaveStyle({ height: `${SETTINGS_GROUP_HEADER_HEIGHT}px` });
  });

  it('highlights the border only when one of the grouped cards is selected', () => {
    const { rerender } = renderGroup({ hasSelection: false });
    const idleBorder = getComputedStyle(screen.getByTestId('workflowGraphSettingsGroup')).border;

    rerender(<WorkflowGraphSettingsGroupNode {...makeNodeProps({ hasSelection: true })} />);
    const selectedBorder = getComputedStyle(
      screen.getByTestId('workflowGraphSettingsGroup')
    ).border;

    expect(selectedBorder).not.toBe(idleBorder);
  });

  it('renders the idle border when hasSelection is omitted', () => {
    const { rerender } = renderGroup({});
    const omittedBorder = getComputedStyle(screen.getByTestId('workflowGraphSettingsGroup')).border;

    rerender(<WorkflowGraphSettingsGroupNode {...makeNodeProps({ hasSelection: false })} />);

    expect(getComputedStyle(screen.getByTestId('workflowGraphSettingsGroup')).border).toBe(
      omittedBorder
    );
  });
});
