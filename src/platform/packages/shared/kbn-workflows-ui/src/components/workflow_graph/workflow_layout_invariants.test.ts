/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Class-level layout tests: generate many workflows from seeds and assert the layout
 * rules on every one, instead of checking each fix on the single shape that prompted
 * it. A failure names the rule, the direction and the seed, which reproduces the
 * workflow with `generateWorkflow(seed)`.
 */

import { transformWorkflowToGraph } from '@kbn/workflows';
import type { LayoutDirection, StructureSequence, TransformResult } from '@kbn/workflows';
import { computeWorkflowLayout, WORKFLOW_COMPOUND_PADDING } from './workflow_layout_pipeline';
import { checkLayoutInvariants } from '../../test_utils/workflow_layout/check_layout_invariants';
import { generateWorkflow } from '../../test_utils/workflow_layout/generate_workflow';

const SEEDS = Array.from({ length: 400 }, (_, index) => index + 1);
const DIRECTIONS: readonly LayoutDirection[] = ['TB', 'LR'];

const collectViolationKeys = (): Set<string> => {
  const keys = new Set<string>();
  for (const seed of SEEDS) {
    const transformed = transformWorkflowToGraph(generateWorkflow(seed));
    for (const direction of DIRECTIONS) {
      const layout = computeWorkflowLayout(transformed, { direction });
      for (const { invariant } of checkLayoutInvariants({
        transformed,
        layout,
        direction,
        compoundPadding: WORKFLOW_COMPOUND_PADDING,
      })) {
        keys.add(`${invariant}:${direction}:${seed}`);
      }
    }
  }
  return keys;
};

/** Every node id of a structure, plus the fork branches and lanes it declares, for cross-checks. */
const walkStructure = (
  items: StructureSequence,
  visit: {
    node: (id: string) => void;
    fork: (owner: string, heads: readonly string[], labels: readonly string[]) => void;
    lane: (owner: string, head: string) => void;
  }
): void => {
  for (const item of items) {
    visit.node(item.id);
    if (item.kind === 'fork') {
      visit.fork(
        item.id,
        item.branches.map((branch) => branch.head),
        item.branches.map((branch) => branch.label)
      );
      for (const branch of item.branches) {
        if (branch.items.length === 0) visit.node(branch.head);
        walkStructure(branch.items, visit);
      }
    }
    if (item.kind === 'container') walkStructure(item.body, visit);
    if (item.kind === 'step' && item.attached) walkStructure(item.attached, visit);
    for (const lane of item.lanes) {
      visit.lane(item.id, lane.head);
      walkStructure(lane.items, visit);
    }
  }
};

const allEdges = (transformed: TransformResult) => [
  ...transformed.edges,
  ...transformed.foreachGroups.flatMap((group) => group.innerEdges),
];

const allNodeIds = (transformed: TransformResult): string[] => [
  ...transformed.nodes.filter((n) => n.type !== 'trigger').map((n) => n.id),
  ...transformed.bypassLaneNodes.map((n) => n.id),
  ...transformed.foreachGroups.flatMap((group) => [
    ...group.innerNodes.map((n) => n.id),
    ...group.bypassLaneNodes.map((n) => n.id),
  ]),
];

describe('workflow layout invariants over generated workflows', () => {
  it('generates the same workflow for the same seed', () => {
    expect(generateWorkflow(7)).toEqual(generateWorkflow(7));
    expect(generateWorkflow(7)).not.toEqual(generateWorkflow(8));
  });

  it('covers every control-flow shape the layout has to handle', () => {
    const corpus = SEEDS.map((seed) => JSON.stringify(generateWorkflow(seed))).join('\n');
    for (const shape of [
      '"type":"if"',
      '"else":[',
      '"type":"switch"',
      '"default":[',
      '"type":"parallel"',
      '"type":"foreach"',
      '"fallback":[',
      '"continue":true',
    ]) {
      expect(corpus).toContain(shape);
    }
  });

  it('covers the shapes real workflows have that a plain corpus would miss', () => {
    interface Shape {
      type?: string;
      cases?: Array<{ match?: unknown; steps?: Shape[] }>;
      branches?: Array<{ steps?: Shape[] }>;
      steps?: Shape[];
      else?: Shape[];
      default?: Shape[];
      'on-failure'?: { fallback?: Shape[] };
    }
    const found = new Set<string>();
    const walk = (steps: Shape[] | undefined, depth: number): void => {
      if (depth >= 4) found.add('four levels deep');
      for (const step of steps ?? []) {
        const cases = step.cases ?? [];
        if (cases.length >= 6) found.add('switch with 6 or more cases');
        if (cases.some((c) => String(c.match).length > 24))
          found.add('case label over 24 characters');
        if (cases.some((c) => (c.steps ?? []).length === 0)) found.add('empty switch case');
        const branches = step.branches ?? [];
        if (
          branches.some((b) => (b.steps ?? []).length === 0) &&
          branches.some((b) => (b.steps ?? []).length > 0)
        ) {
          found.add('empty parallel branch beside a filled one');
        }
        if (step.type === 'foreach' && step['on-failure']?.fallback) {
          found.add('foreach that owns a fallback lane');
        }
        for (const child of [
          step.steps,
          step.else,
          step.default,
          step['on-failure']?.fallback,
          ...cases.map((c) => c.steps),
          ...branches.map((b) => b.steps),
        ]) {
          walk(child, depth + 1);
        }
      }
    };
    for (const seed of SEEDS) {
      walk((generateWorkflow(seed) as unknown as { steps: Shape[] }).steps, 0);
    }
    expect([...found].sort()).toEqual([
      'case label over 24 characters',
      'empty parallel branch beside a filled one',
      'empty switch case',
      'foreach that owns a fallback lane',
      'four levels deep',
      'switch with 6 or more cases',
    ]);
  });

  it('lays out every workflow without throwing and deterministically', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const transformed = transformWorkflowToGraph(generateWorkflow(seed));
      for (const direction of DIRECTIONS) {
        const first = computeWorkflowLayout(transformed, { direction });
        expect(computeWorkflowLayout(transformed, { direction })).toEqual(first);
      }
    }
  });

  it('breaks no layout rule on any generated workflow', () => {
    expect([...collectViolationKeys()].sort()).toEqual([]);
  });

  it('emits a structure that agrees with the flat graph for every workflow', () => {
    for (const seed of SEEDS) {
      const transformed = transformWorkflowToGraph(generateWorkflow(seed));
      const edges = allEdges(transformed);
      const ids: string[] = [];
      const forks: Array<[string, readonly string[], readonly string[]]> = [];
      const lanes: Array<[string, string]> = [];
      walkStructure(transformed.structure?.items ?? [], {
        node: (id) => ids.push(id),
        fork: (owner, heads, labels) => forks.push([owner, heads, labels]),
        lane: (owner, head) => lanes.push([owner, head]),
      });

      // Every node is placed exactly once.
      expect({ seed, ids: [...ids].sort() }).toEqual({ seed, ids: allNodeIds(transformed).sort() });

      // A fork's branch heads and labels are its branch edges' targets and labels, in declaration order.
      for (const [owner, heads, labels] of forks) {
        const branchEdges = edges.filter(
          (e) =>
            e.source === owner &&
            !e.isFailure &&
            (e.branchType !== undefined || e.branchIndex !== undefined)
        );
        expect({ seed, owner, heads, labels }).toEqual({
          seed,
          owner,
          heads: branchEdges.map((e) => e.target),
          labels: branchEdges.map((e) => e.label),
        });
      }

      // A lane is entered by the failure edge from its owner to its head, and no other lane exists.
      expect({ seed, lanes: lanes.map(([owner, head]) => `${owner}>${head}`).sort() }).toEqual({
        seed,
        lanes: transformed.fallbackLanes.map((lane) => `${lane.owner}>${lane.head}`).sort(),
      });
      for (const [owner, head] of lanes) {
        expect(edges).toContainEqual(
          expect.objectContaining({ source: owner, target: head, isFailure: true })
        );
      }
    }
  });
});
