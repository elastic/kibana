/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import type { LayoutInvariant } from './check_layout_invariants';
import { checkLayoutInvariants } from './check_layout_invariants';
import {
  computeWorkflowLayout,
  WORKFLOW_COMPOUND_PADDING,
} from '../../components/workflow_graph/workflow_layout_pipeline';

/**
 * The corpus test is only as good as its checker: a rule that never fires would pass
 * every layout. Each case starts from a layout with no violations, damages it in the one
 * way the rule is about, and expects that rule (and only a violation of that rule) to appear.
 */

const workflow = (steps: unknown, triggers = [{ type: 'manual', enabled: true }]) =>
  ({
    name: 'wf',
    enabled: true,
    triggers,
    steps,
  } as unknown as WorkflowYaml);

const http = (name: string) => ({ name, type: 'http' });
const ifStep = (name: string, then: unknown[], otherwise: unknown[] = []) => ({
  name,
  type: 'if',
  condition: 'x',
  steps: then,
  ...(otherwise.length > 0 ? { else: otherwise } : {}),
});

const start = (wf: WorkflowYaml) => {
  const transformed = transformWorkflowToGraph(wf);
  const layout = computeWorkflowLayout(transformed, { direction: 'TB' });
  const check = (nodes = layout.nodes) =>
    checkLayoutInvariants({
      transformed,
      layout: { ...layout, nodes },
      direction: 'TB',
      compoundPadding: WORKFLOW_COMPOUND_PADDING,
    });
  const moved = (changes: Record<string, { dx?: number; dy?: number; dwidth?: number }>) =>
    layout.nodes.map((n) => {
      const change = changes[n.id];
      return change
        ? {
            ...n,
            x: n.x + (change.dx ?? 0),
            y: n.y + (change.dy ?? 0),
            width: n.width + (change.dwidth ?? 0),
          }
        : n;
    });
  const node = (id: string) => {
    const found = layout.nodes.find((n) => n.id === id);
    if (!found) throw new Error(`Expected node "${id}"`);
    return found;
  };
  return { check, moved, node };
};

const rulesOf = (violations: Array<{ invariant: LayoutInvariant }>) => [
  ...new Set(violations.map((v) => v.invariant)),
];

describe('checkLayoutInvariants', () => {
  const branching = () =>
    start(workflow([ifStep('gate', [http('t1'), http('t2')], [http('e1')]), http('after')]));

  it('reports nothing for a layout produced by the pipeline', () => {
    expect(branching().check()).toEqual([]);
  });

  it('overlap: two nodes on top of each other', () => {
    const { check, moved, node } = branching();
    const dx = node('t1').x - node('e1').x;
    const dy = node('t1').y - node('e1').y;
    expect(rulesOf(check(moved({ e1: { dx, dy } })))).toContain('overlap');
  });

  it('forkOrder: branches swapped against declaration order', () => {
    const { check, moved, node } = branching();
    const gap = node('e1').x - node('t1').x;
    expect(rulesOf(check(moved({ t1: { dx: gap }, t2: { dx: gap }, e1: { dx: -gap } })))).toContain(
      'forkOrder'
    );
  });

  it('ownerCentred: the gate is off the midpoint of its branch heads', () => {
    const { check, moved } = branching();
    expect(rulesOf(check(moved({ gate: { dx: 80 } })))).toContain('ownerCentred');
  });

  it('joinAligned: the step after a fork is off the gate column', () => {
    const { check, moved } = branching();
    expect(rulesOf(check(moved({ after: { dx: 80 } })))).toContain('joinAligned');
  });

  it('chainStraight: a step in a branch jogs sideways from its predecessor', () => {
    const { check, moved } = branching();
    expect(rulesOf(check(moved({ t2: { dx: 40 } })))).toContain('chainStraight');
  });

  it('mergeDropClear: a node stands in the straight drop of a merge edge', () => {
    const { check, moved, node } = branching();
    // e1 is the merge source of the false branch; park t1 in the middle of its drop.
    const dx = node('e1').x - node('t1').x;
    const dy = (node('after').y - node('t1').y) / 2 - 10;
    expect(rulesOf(check(moved({ t1: { dx, dy } })))).toContain('mergeDropClear');
  });

  it('labelClear: a bypass lane narrower than the label drawn over it', () => {
    const { check, moved } = start(workflow([ifStep('gate', [http('t1')]), http('after')]));
    expect(rulesOf(check(moved({ 'gate-else-bypass': { dwidth: -30 } })))).toContain('labelClear');
  });

  it('does not read the body of a merge step as a broken chain', () => {
    // The body hangs to the right of the merge step by design, even with nothing after it.
    const { check } = start(
      workflow([{ name: 'combine', type: 'merge', steps: [http('m1'), http('m2')] }])
    );
    expect(check()).toEqual([]);
  });

  it('triggerOrder: triggers out of declaration order', () => {
    const { check, moved, node } = start(
      workflow([http('first')], [
        { type: 'manual', enabled: true },
        { type: 'alert', enabled: true },
      ] as never)
    );
    const gap = node('alert').x - node('manual').x;
    expect(rulesOf(check(moved({ manual: { dx: gap }, alert: { dx: -gap } })))).toContain(
      'triggerOrder'
    );
  });

  describe('containers', () => {
    const loop = () =>
      start(
        workflow([
          { name: 'loop', type: 'foreach', foreach: 'items', steps: [http('i1'), http('i2')] },
          http('after'),
        ])
      );

    it('containment: a body node escapes the box', () => {
      const { check, moved } = loop();
      expect(rulesOf(check(moved({ i2: { dx: 400 } })))).toContain('containment');
    });

    it('containerTight: the box is wider than its body plus padding', () => {
      const { check, moved } = loop();
      expect(rulesOf(check(moved({ loop: { dwidth: 200 } })))).toContain('containerTight');
    });
  });

  it('forkInterleave: forks in different branches alternate their heads', () => {
    const { check, moved, node } = start(
      workflow([
        ifStep(
          'outer',
          [ifStep('g1', [http('t1')], [http('e1')])],
          [ifStep('g2', [http('t2')], [http('e2')])]
        ),
      ])
    );
    // Swap e1 and t2 so the heads read g1, g2, g1, g2 from left to right.
    const gap = node('t2').x - node('e1').x;
    expect(rulesOf(check(moved({ e1: { dx: gap }, t2: { dx: -gap } })))).toContain(
      'forkInterleave'
    );
  });
});
