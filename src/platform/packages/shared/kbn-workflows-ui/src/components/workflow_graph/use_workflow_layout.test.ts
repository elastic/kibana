/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowLayout } from './use_workflow_layout';

const minimal = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml =>
  ({
    name: 'wf',
    enabled: true,
    triggers: [{ type: 'manual', enabled: true }],
    steps: [],
    ...overrides,
  } as unknown as WorkflowYaml);

/** Minimal step-execution factory — only the fields the layout hook reads. */
const stepExec = (
  stepId: string,
  status: ExecutionStatus,
  branchScope?: { gate: string; scopeId: string }
): WorkflowStepExecutionDto =>
  ({
    id: stepId,
    stepId,
    status,
    scopeStack: branchScope
      ? [
          {
            stepId: branchScope.gate,
            nestedScopes: [
              { nodeId: branchScope.gate, nodeType: 'if', scopeId: branchScope.scopeId },
            ],
          },
        ]
      : [],
  } satisfies Partial<WorkflowStepExecutionDto> as WorkflowStepExecutionDto);

const traversedOf = (edge: { data?: unknown } | undefined): boolean | undefined =>
  (edge?.data as Record<string, unknown> | undefined)?.traversed as boolean | undefined;

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

    it('tags ALL fan-in edges isMerge when both if branches are present', () => {
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

    it('tags trigger edges isMerge when two triggers join the first step', () => {
      const workflow = minimal({
        triggers: [
          { type: 'alert', enabled: true },
          { type: 'manual', enabled: true },
        ],
        steps: [{ name: 'first', type: 'http' }] as unknown as WorkflowYaml['steps'],
      });
      const { result } = renderHook(() => useWorkflowLayout({ workflow }));
      const triggerEdges = result.current.edges.filter((e) => e.target === 'first');
      expect(triggerEdges).toHaveLength(2);
      expect(triggerEdges.every((e) => (e.data as Record<string, unknown>)?.isMerge === true)).toBe(
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

  describe('branch-aware execution highlighting', () => {
    const findForkEdge = <T extends { source: string; target: string; data?: unknown }>(
      edges: T[],
      gate: string,
      branchType: string
    ): T | undefined =>
      edges.find(
        (e) =>
          e.source === gate &&
          (e.data as Record<string, unknown> | undefined)?.branchType === branchType
      );

    it('highlights only the taken (true) branch and greys the empty else lane', () => {
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
      const stepExecutions = [
        stepExec('gate', ExecutionStatus.COMPLETED),
        stepExec('then_step', ExecutionStatus.COMPLETED, { gate: 'gate', scopeId: 'true' }),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges } = result.current;

      const thenEdge = findForkEdge(edges, 'gate', 'then');
      const elseEdge = findForkEdge(edges, 'gate', 'else');
      expect(traversedOf(thenEdge)).toBe(true);
      expect(traversedOf(elseEdge)).toBe(false);

      // then-step -> merge is green; the empty else lane (bypass -> merge) is grey.
      const thenLeafEdge = edges.find((e) => e.source === 'then-step' && e.target === 'after');
      expect(traversedOf(thenLeafEdge)).toBe(true);
      const bypassId = elseEdge!.target;
      const bypassLeafEdge = edges.find((e) => e.source === bypassId && e.target === 'after');
      expect(traversedOf(bypassLeafEdge)).toBe(false);
    });

    it('highlights the empty else lane via elimination when the false path is taken', () => {
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
      // Only the gate ran (condition false, empty else) — no child scopes exist.
      const stepExecutions = [
        stepExec('gate', ExecutionStatus.COMPLETED),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges, nodes } = result.current;

      const thenEdge = findForkEdge(edges, 'gate', 'then');
      const elseEdge = findForkEdge(edges, 'gate', 'else');
      expect(traversedOf(elseEdge)).toBe(true);
      expect(traversedOf(thenEdge)).toBe(false);

      const bypassId = elseEdge!.target;
      const bypassLeafEdge = edges.find((e) => e.source === bypassId && e.target === 'after');
      expect(traversedOf(bypassLeafEdge)).toBe(true);
      // The un-taken then step and its leaf edge stay grey.
      const thenLeafEdge = edges.find((e) => e.source === 'then-step' && e.target === 'after');
      expect(traversedOf(thenLeafEdge)).toBe(false);

      // The bypass lane node itself is marked traversed so the bridge line greens.
      const bypassNode = nodes.find((n) => n.id === bypassId);
      expect((bypassNode?.data as Record<string, unknown>)?.traversed).toBe(true);
    });

    it('highlights only the executed branch when both branches are populated', () => {
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
      const stepExecutions = [
        stepExec('gate', ExecutionStatus.COMPLETED),
        stepExec('yes', ExecutionStatus.COMPLETED, { gate: 'gate', scopeId: 'true' }),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges } = result.current;

      expect(traversedOf(findForkEdge(edges, 'gate', 'then'))).toBe(true);
      expect(traversedOf(findForkEdge(edges, 'gate', 'else'))).toBe(false);
      expect(traversedOf(edges.find((e) => e.source === 'yes' && e.target === 'after'))).toBe(true);
      expect(traversedOf(edges.find((e) => e.source === 'no' && e.target === 'after'))).toBe(false);
    });

    it('highlights the else branch when the false path is taken (both populated)', () => {
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
      const stepExecutions = [
        stepExec('gate', ExecutionStatus.COMPLETED),
        stepExec('no', ExecutionStatus.COMPLETED, { gate: 'gate', scopeId: 'false' }),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges } = result.current;

      expect(traversedOf(findForkEdge(edges, 'gate', 'else'))).toBe(true);
      expect(traversedOf(findForkEdge(edges, 'gate', 'then'))).toBe(false);
      expect(traversedOf(edges.find((e) => e.source === 'no' && e.target === 'after'))).toBe(true);
      expect(traversedOf(edges.find((e) => e.source === 'yes' && e.target === 'after'))).toBe(
        false
      );
    });

    it('highlights the matched switch case and greys the default bypass lane', () => {
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
      const stepExecutions = [
        stepExec('sw', ExecutionStatus.COMPLETED),
        stepExec('on_a', ExecutionStatus.COMPLETED, { gate: 'sw', scopeId: 'case_a' }),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges } = result.current;

      const caseEdge = edges.find(
        (e) => e.source === 'sw' && (e.data as Record<string, unknown> | undefined)?.label === 'a'
      );
      const defaultEdge = edges.find(
        (e) =>
          e.source === 'sw' && (e.data as Record<string, unknown> | undefined)?.label === 'default'
      );
      expect(traversedOf(caseEdge)).toBe(true);
      expect(traversedOf(defaultEdge)).toBe(false);
      expect(traversedOf(edges.find((e) => e.source === 'on-a' && e.target === 'after'))).toBe(
        true
      );
      const bypassId = defaultEdge!.target;
      expect(traversedOf(edges.find((e) => e.source === bypassId && e.target === 'after'))).toBe(
        false
      );
    });

    it('highlights the implicit default lane when a switch falls through (no case matched)', () => {
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
      // Only the switch gate ran — no case scope exists, so the completed switch
      // must have fallen through its (synthesized, empty) default lane.
      const stepExecutions = [
        stepExec('sw', ExecutionStatus.COMPLETED),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges, nodes } = result.current;

      const caseEdge = edges.find(
        (e) => e.source === 'sw' && (e.data as Record<string, unknown> | undefined)?.label === 'a'
      );
      const defaultEdge = edges.find(
        (e) =>
          e.source === 'sw' && (e.data as Record<string, unknown> | undefined)?.label === 'default'
      );
      expect(traversedOf(defaultEdge)).toBe(true);
      expect(traversedOf(caseEdge)).toBe(false);

      const bypassId = defaultEdge!.target;
      expect(traversedOf(edges.find((e) => e.source === bypassId && e.target === 'after'))).toBe(
        true
      );
      const bypassNode = nodes.find((n) => n.id === bypassId);
      expect((bypassNode?.data as Record<string, unknown>)?.traversed).toBe(true);
    });

    it('orders edges so traversed ones paint last (over the shared fork/merge trunk)', () => {
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
      const stepExecutions = [
        stepExec('gate', ExecutionStatus.COMPLETED),
        stepExec('yes', ExecutionStatus.COMPLETED, { gate: 'gate', scopeId: 'true' }),
        stepExec('after', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const flags = result.current.edges.map((e) => Boolean(traversedOf(e)));
      // Both groups are non-empty here, and every traversed edge must come after
      // every non-traversed edge (a single false→true transition, never back).
      expect(flags).toContain(true);
      expect(flags).toContain(false);
      const firstTraversed = flags.indexOf(true);
      expect(flags.slice(firstTraversed).every(Boolean)).toBe(true);
    });

    it('highlights the edge leaving the trigger node once the run has started', () => {
      const workflow = minimal({
        steps: [
          { name: 'first', type: 'http' },
          { name: 'second', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const stepExecutions = [
        stepExec('first', ExecutionStatus.COMPLETED),
        stepExec('second', ExecutionStatus.COMPLETED),
      ];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges, nodes } = result.current;

      const triggerNode = nodes.find((n) => n.type === 'trigger');
      expect(triggerNode).toBeDefined();
      const triggerEdge = edges.find((e) => e.source === triggerNode!.id);
      expect(triggerEdge).toBeDefined();
      expect(traversedOf(triggerEdge)).toBe(true);
    });

    it('does not highlight any branch while the gate is still running', () => {
      const workflow = minimal({
        steps: [
          {
            name: 'gate',
            type: 'if',
            condition: 'x',
            steps: [{ name: 'then_step', type: 'http' }],
          },
          { name: 'after', type: 'http' },
        ] as unknown as WorkflowYaml['steps'],
      });
      const stepExecutions = [stepExec('gate', ExecutionStatus.RUNNING)];
      const { result } = renderHook(() => useWorkflowLayout({ workflow, stepExecutions }));
      const { edges } = result.current;

      expect(traversedOf(findForkEdge(edges, 'gate', 'then'))).toBe(false);
      expect(traversedOf(findForkEdge(edges, 'gate', 'else'))).toBe(false);
    });
  });
});
