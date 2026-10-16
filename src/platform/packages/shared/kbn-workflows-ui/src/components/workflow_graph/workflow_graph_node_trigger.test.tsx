/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { Handle } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import React from 'react';
import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  type WorkflowGraphActions,
  WorkflowGraphActionsContext,
} from './workflow_graph_actions_context';
import { WorkflowGraphNode, type WorkflowGraphNodeData } from './workflow_graph_node';

// Spy on Handle: records the props the node mounts so handle types can be asserted
// without a React Flow store.
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  Handle: jest.fn().mockReturnValue(null),
  useUpdateNodeInternals: () => jest.fn(),
}));

const mockHandle = jest.mocked(Handle);

const makeNodeProps = (
  type: 'step' | 'trigger',
  data: WorkflowGraphNodeData
): NodeProps<Node<WorkflowGraphNodeData>> => ({
  id: 'node-1',
  type,
  data,
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

const renderNode = (
  type: 'step' | 'trigger',
  data: WorkflowGraphNodeData,
  actions: WorkflowGraphActions = {}
) =>
  render(
    <WorkflowGraphActionsContext.Provider value={actions}>
      <WorkflowGraphNode {...makeNodeProps(type, data)} />
    </WorkflowGraphActionsContext.Provider>
  );

const mountedHandleTypes = (): Array<'source' | 'target'> =>
  mockHandle.mock.calls.map(([props]) => props.type);

const runActions: WorkflowGraphActions = { onStepRun: jest.fn(), canRunSteps: true };

describe('WorkflowGraphNode trigger vs step', () => {
  beforeEach(() => {
    mockHandle.mockClear();
  });

  describe('trigger node', () => {
    const trigger: WorkflowGraphNodeData = { label: 'Manual', stepType: 'manual', isTrigger: true };

    it('mounts no target handle (nothing flows into a trigger) but keeps a source handle', () => {
      renderNode('trigger', trigger);

      expect(mountedHandleTypes()).not.toContain('target');
      expect(mountedHandleTypes()).toContain('source');
    });

    it('never offers the Run action, even when step runs are enabled', () => {
      renderNode('trigger', trigger, runActions);

      expect(screen.queryByTestId('workflowGraphNodeRunStep')).not.toBeInTheDocument();
    });

    it('mounts no target handle in the compact preview either', () => {
      renderNode('trigger', { ...trigger, preview: true });

      expect(mountedHandleTypes()).not.toContain('target');
    });
  });

  describe('step node', () => {
    const step: WorkflowGraphNodeData = { label: 'fetch', stepType: 'http' };

    it('mounts a target handle and a source handle', () => {
      renderNode('step', step);

      expect(mountedHandleTypes()).toEqual(expect.arrayContaining(['target', 'source']));
    });

    it('offers the Run action when step runs are enabled', () => {
      renderNode('step', step, runActions);

      expect(screen.getByTestId('workflowGraphNodeRunStep')).toBeInTheDocument();
    });
  });

  // The node decides "trigger-ness" from `data.isTrigger` (handles, Run) and from
  // `isTrigger || TRIGGER_STEP_TYPES` (chip, label). Those can only diverge for a
  // step-typed node whose stepType is a trigger type, which the transform never
  // produces: it flags every `type: 'trigger'` node and no step node.
  describe('flag produced by transformWorkflowToGraph', () => {
    const workflow: WorkflowYaml = {
      version: '1',
      name: 'wf',
      enabled: true,
      triggers: [{ type: 'manual' }, { type: 'scheduled', with: { every: '5m' } }],
      steps: [
        { name: 'first', type: 'console', with: { message: 'a' } },
        {
          name: 'branch',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'inner', type: 'http' }],
        },
      ],
    };

    const { nodes } = transformWorkflowToGraph(workflow);
    const triggerNodes = nodes.filter((n) => n.type === 'trigger');
    const stepNodes = nodes.filter((n) => n.type !== 'trigger');

    it('covers both triggers and steps', () => {
      expect(triggerNodes).toHaveLength(2);
      expect(stepNodes.length).toBeGreaterThan(0);
    });

    it.each(triggerNodes.map((n) => [n.data.stepType, n] as const))(
      'flags the %s trigger node, so it renders without a target handle or Run action',
      (_stepType, node) => {
        expect(node.data.isTrigger).toBe(true);

        renderNode(
          'trigger',
          { label: node.data.label, stepType: node.data.stepType, isTrigger: true },
          runActions
        );

        expect(mountedHandleTypes()).not.toContain('target');
        expect(screen.queryByTestId('workflowGraphNodeRunStep')).not.toBeInTheDocument();
      }
    );

    it('never flags a step node as a trigger', () => {
      stepNodes.forEach((node) => {
        expect(node.data.isTrigger).toBeUndefined();
      });
    });
  });
});
