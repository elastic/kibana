/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { WorkflowYaml } from '@kbn/workflows';
import { useWorkflowLayout } from './use_workflow_layout';

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

describe('useWorkflowLayout', () => {
  describe('isMerge / hideEndMarker edge tagging', () => {
    it('tags ALL fan-in edges isMerge for a then-only if (bypass on else lane)', () => {
      const workflow = minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x > 1',
            steps: [{ name: 'then_step', type: 'http' }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const fanInEdges = result.current.edges.filter((e) => e.target === 'after');
      // Both the then-leaf edge and the bypass-lane edge must carry isMerge.
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => (e.data as Record<string, unknown>)?.isMerge === true)).toBe(
        true
      );
      // Only the fork → bypass edge suppresses the arrowhead.
      const forkToBypass = result.current.edges.find(
        (e) => e.source === 'gate' && e.target !== 'then-step' && e.target !== 'after'
      );
      expect((forkToBypass?.data as Record<string, unknown>)?.hideEndMarker).toBe(true);
    });

    it('tags ALL fan-in edges isMerge for a switch with no default (bypass on default lane)', () => {
      const workflow = minimal({
        steps: [
          {
            name: 'sw',
            type: 'switch',
            expression: 'x',
            cases: [{ match: 'a', steps: [{ name: 'on_a', type: 'http' }] }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const fanInEdges = result.current.edges.filter((e) => e.target === 'after');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => (e.data as Record<string, unknown>)?.isMerge === true)).toBe(
        true
      );
    });

    it('tags fan-in edges isMerge when both if branches are populated (no bypass lane)', () => {
      // Both branches are real steps — no bypass lane — so previously isMerge
      // was NOT set and edges fell through to getSmoothStepPath. With equal-depth
      // branches both leaves share a rank, so the midpoint bend was invisible;
      // but with unequal-depth branches (as in the reported repros) the midpoint
      // appeared as a band far above the join node.
      const workflow = minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x',
            steps: [{ name: 'yes', type: 'http' }],
            else: [{ name: 'no', type: 'http' }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const fanInEdges = result.current.edges.filter((e) => e.target === 'after');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => (e.data as Record<string, unknown>)?.isMerge === true)).toBe(
        true
      );
    });

    it('does NOT tag a plain sequential edge isMerge', () => {
      const workflow = minimal({
        steps: [
          { name: 'a', type: 'http' },
          { name: 'b', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const edge = result.current.edges.find((e) => e.source === 'a' && e.target === 'b');
      expect(edge).toBeDefined();
      expect((edge?.data as Record<string, unknown>)?.isMerge).toBeFalsy();
    });

    it('tags isMerge on all six fan-in edges (behavior workflow topology)', () => {
      // Regression: remediate-behavior-windows-script-file has 6 leaves joining
      // into a single `summary` sibling. All were real steps (no bypass lane),
      // so isMerge was false and all six bent at their own smooth-step midpoints,
      // forming a broad horizontal band far above the join node.
      //
      // Topology: route(switch, 5 cases + default) → leaf_a … leaf_e, leaf_default
      //           summary (sibling)
      // 5 cases + 1 default = 6 real paths, no bypass lane → toHaveLength(6).
      const workflow = minimal({
        steps: [
          {
            name: 'route',
            type: 'switch',
            expression: 'x',
            cases: [
              { match: 'a', steps: [{ name: 'leaf_a', type: 'http' }] },
              { match: 'b', steps: [{ name: 'leaf_b', type: 'http' }] },
              { match: 'c', steps: [{ name: 'leaf_c', type: 'http' }] },
              { match: 'd', steps: [{ name: 'leaf_d', type: 'http' }] },
              { match: 'e', steps: [{ name: 'leaf_e', type: 'http' }] },
            ],
            default: [{ name: 'leaf_default', type: 'http' }],
          },
          { name: 'summary', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const fanInEdges = result.current.edges.filter((e) => e.target === 'summary');
      expect(fanInEdges).toHaveLength(6);
      expect(fanInEdges.every((e) => (e.data as Record<string, unknown>)?.isMerge === true)).toBe(
        true
      );
    });

    it('tags isMerge on fan-in edges inside a foreach body', () => {
      // Pins the disjoint-union argument: inner edges (foreachGroups[].innerEdges)
      // are included in incomingByTarget, so a fan-in inside a foreach body is
      // also tagged — and the fix does not cross the container boundary.
      const workflow = minimal({
        steps: [
          {
            name: 'loop',
            type: 'foreach',
            foreach: 'items',
            steps: [
              {
                name: 'inner_gate',
                type: 'if',
                condition: 'y',
                steps: [{ name: 'inner_yes', type: 'http' }],
                else: [{ name: 'inner_no', type: 'http' }],
              },
              { name: 'inner_after', type: 'http' },
            ],
          },
        ] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const fanInEdges = result.current.edges.filter((e) => e.target === 'inner-after');
      expect(fanInEdges).toHaveLength(2);
      expect(fanInEdges.every((e) => (e.data as Record<string, unknown>)?.isMerge === true)).toBe(
        true
      );
      // Outer loop→loop-sibling edges must NOT be tagged (only one predecessor).
      const outerEdges = result.current.edges.filter((e) => e.target === 'loop');
      expect(outerEdges.every((e) => !(e.data as Record<string, unknown>)?.isMerge)).toBe(true);
    });
  });

  it('includes foreach inner nodes and edges', () => {
    const workflow = minimal({
      steps: [
        {
          name: 'loop',
          type: 'foreach',
          foreach: 'items',
          steps: [
            { name: 'inner_a', type: 'http' },
            { name: 'inner_b', type: 'http' },
          ],
        },
      ] as unknown as WorkflowYaml['steps'],
    });

    const { result } = renderHook(() => useWorkflowLayout({ workflow }));

    const nodeIds = result.current.nodes.map((n) => n.id);
    expect(nodeIds).toEqual(expect.arrayContaining(['loop', 'inner-a', 'inner-b']));

    const innerA = result.current.nodes.find((n) => n.id === 'inner-a');
    const innerB = result.current.nodes.find((n) => n.id === 'inner-b');
    expect(innerA?.parentId).toBe('loop');
    expect(innerB?.parentId).toBe('loop');

    const edgeIds = result.current.edges.map((e) => e.id);
    expect(edgeIds).toEqual(expect.arrayContaining(['inner-a:inner-b']));
  });
});
