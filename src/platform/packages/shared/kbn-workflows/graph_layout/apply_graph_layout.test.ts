/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { applyGraphLayout } from './apply_graph_layout';
import { transformWorkflowToGraph } from './transform_workflow_to_graph';
import type { ForeachGroup, PreLayoutForeachGroupNode } from './types';
import type { WorkflowYaml } from '../spec/schema';

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

describe('applyGraphLayout', () => {
  it('gives every node a numeric position', () => {
    const { nodes, edges, foreachGroups } = transformWorkflowToGraph(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const { nodes: laid } = applyGraphLayout(nodes, edges, foreachGroups);
    for (const n of laid) {
      expect(typeof n.position.x).toBe('number');
      expect(typeof n.position.y).toBe('number');
      expect(isFinite(n.position.x)).toBe(true);
      expect(isFinite(n.position.y)).toBe(true);
    }
  });

  it('places foreach group inner nodes with parentId and extent parent', () => {
    const { nodes, edges, foreachGroups } = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            foreach: 'items',
            steps: [
              { name: 'a', type: 'http' },
              { name: 'b', type: 'http' },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const { nodes: laid } = applyGraphLayout(nodes, edges, foreachGroups);
    const innerNodes = laid.filter((n) => n.parentId === 'loop');
    expect(innerNodes).toHaveLength(2);
    for (const n of innerNodes) {
      expect(n.extent).toBe('parent');
    }
  });

  it('sizes the foreach group container to encompass its inner nodes plus padding', () => {
    const GROUP_PADDING_X = 32;
    const GROUP_PADDING_TOP = 70;
    const GROUP_PADDING_BOTTOM = 32;

    const { nodes, edges, foreachGroups } = transformWorkflowToGraph(
      minimal({
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            foreach: 'items',
            steps: [{ name: 'inner', type: 'http' }],
          },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const { nodes: laid } = applyGraphLayout(nodes, edges, foreachGroups);
    const groupNode = laid.find((n) => n.id === 'loop');
    const innerNode = laid.find((n) => n.id === 'inner');
    expect(groupNode).toBeDefined();
    expect(innerNode).toBeDefined();
    // Group must be wide and tall enough to hold inner node plus padding.
    expect(groupNode!.style.width).toBeGreaterThanOrEqual(
      innerNode!.style.width + GROUP_PADDING_X * 2
    );
    expect(groupNode!.style.height).toBeGreaterThanOrEqual(
      innerNode!.style.height + GROUP_PADDING_TOP + GROUP_PADDING_BOTTOM
    );
  });

  it('TB layout produces smaller x-spread than y-spread for a linear chain', () => {
    const { nodes, edges, foreachGroups } = transformWorkflowToGraph(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
          { name: 'c', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const { nodes: tbLaid } = applyGraphLayout(nodes, edges, foreachGroups, { direction: 'TB' });
    const { nodes: lrLaid } = applyGraphLayout(nodes, edges, foreachGroups, { direction: 'LR' });

    // In TB mode, nodes stack vertically so y-spread > x-spread.
    const tbStepNodes = tbLaid.filter((n) => n.type === 'step');
    const tbXs = tbStepNodes.map((n) => n.position.x);
    const tbYs = tbStepNodes.map((n) => n.position.y);
    const tbXSpread = Math.max(...tbXs) - Math.min(...tbXs);
    const tbYSpread = Math.max(...tbYs) - Math.min(...tbYs);
    expect(tbYSpread).toBeGreaterThan(tbXSpread);

    // In LR mode, nodes spread horizontally so x-spread > y-spread.
    const lrStepNodes = lrLaid.filter((n) => n.type === 'step');
    const lrXs = lrStepNodes.map((n) => n.position.x);
    const lrYs = lrStepNodes.map((n) => n.position.y);
    const lrXSpread = Math.max(...lrXs) - Math.min(...lrXs);
    const lrYSpread = Math.max(...lrYs) - Math.min(...lrYs);
    expect(lrXSpread).toBeGreaterThan(lrYSpread);
  });

  it('returns edges with points arrays', () => {
    const { nodes, edges, foreachGroups } = transformWorkflowToGraph(
      minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      })
    );
    const { edges: laid } = applyGraphLayout(nodes, edges, foreachGroups);
    for (const e of laid) {
      expect(Array.isArray(e.points)).toBe(true);
      expect(e.points!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('throws on a cyclic foreach group graph', () => {
    // Construct a hand-crafted group structure with a cycle: A → B → A.
    const stubStep = { name: 'x', type: 'foreach' } as unknown as import('./types').Step;
    const nodeA: PreLayoutForeachGroupNode = {
      id: 'groupA',
      type: 'foreachGroup',
      data: { label: 'A', stepType: 'foreach', step: stubStep },
      style: { width: 300, height: 64 },
    };
    const nodeB: PreLayoutForeachGroupNode = {
      id: 'groupB',
      type: 'foreachGroup',
      data: { label: 'B', stepType: 'foreach', step: stubStep },
      style: { width: 300, height: 64 },
    };
    // groupA contains groupB; groupB contains groupA → cycle
    const groups: ForeachGroup[] = [
      {
        id: 'groupA',
        innerNodes: [{ ...nodeB, parentId: 'groupA', extent: 'parent' as const }],
        innerEdges: [],
      },
      {
        id: 'groupB',
        innerNodes: [{ ...nodeA, parentId: 'groupB', extent: 'parent' as const }],
        innerEdges: [],
      },
    ];
    expect(() => applyGraphLayout([nodeA, nodeB], [], groups)).toThrow(/cycle/i);
  });
});
