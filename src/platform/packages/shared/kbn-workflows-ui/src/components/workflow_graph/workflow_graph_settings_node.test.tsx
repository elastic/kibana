/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import {
  type WorkflowGraphActions,
  WorkflowGraphActionsContext,
} from './workflow_graph_actions_context';
import {
  WorkflowGraphSettingsNode,
  type WorkflowGraphSettingsNodeData,
} from './workflow_graph_settings_node';

const makeNodeProps = (): NodeProps<Node<WorkflowGraphSettingsNodeData>> => ({
  id: 'settings:info',
  type: 'settings',
  data: {
    kind: 'info',
    label: 'Info',
    subtitle: 'Name and description',
    iconType: 'iInCircle',
  },
  selected: false,
  dragging: false,
  draggable: false,
  selectable: true,
  deletable: false,
  isConnectable: false,
  zIndex: 0,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
});

const renderNode = (actions: WorkflowGraphActions = {}, wrapper?: () => void) =>
  render(
    <div role="presentation" onClick={wrapper}>
      <WorkflowGraphActionsContext.Provider value={actions}>
        <WorkflowGraphSettingsNode {...makeNodeProps()} />
      </WorkflowGraphActionsContext.Provider>
    </div>
  );

describe('WorkflowGraphSettingsNode', () => {
  it('lets a card click bubble to the React Flow node wrapper instead of selecting itself', () => {
    const onSettingsNodeSelect = jest.fn();
    const onWrapperClick = jest.fn();
    renderNode({ onSettingsNodeSelect }, onWrapperClick);

    fireEvent.click(screen.getByRole('button', { name: /Info/ }));

    expect(onWrapperClick).toHaveBeenCalledTimes(1);
    expect(onSettingsNodeSelect).not.toHaveBeenCalled();
  });

  it('selects the settings kind on Enter and Space', () => {
    const onSettingsNodeSelect = jest.fn();
    renderNode({ onSettingsNodeSelect });
    const card = screen.getByRole('button', { name: /Info/ });

    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(onSettingsNodeSelect).toHaveBeenCalledTimes(2);
    expect(onSettingsNodeSelect).toHaveBeenCalledWith('info');
  });
});
