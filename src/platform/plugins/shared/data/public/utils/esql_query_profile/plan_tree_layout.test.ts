/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { layoutPlanTree, planDepth } from './plan_tree_layout';
import type { PlanNode } from './plan_tree';

const node = (label: string, selfNanos: number, children: PlanNode[] = []): PlanNode => ({
  id: label,
  name: `${label}Exec`,
  label,
  detail: '',
  children,
  hasOperator: true,
  selfNanos,
  inclusiveNanos: selfNanos + children.reduce((sum, child) => sum + child.inclusiveNanos, 0),
  rowsIn: 0,
  rowsOut: 0,
});

describe('layoutPlanTree', () => {
  it('gives the root the whole width, and each child a share as large as its time', () => {
    const root = node('Root', 10, [node('A', 60), node('B', 30)]);

    const boxes = layoutPlanTree(root, 1_000, 4);
    const byLabel = new Map(boxes.map((box) => [box.node.label, box]));

    expect(byLabel.get('Root')).toMatchObject({ x: 0, width: 1_000, depth: 0 });
    // The root used 10% itself, so its children cover 90% of it, side by side from the left.
    expect(byLabel.get('A')).toMatchObject({ x: 0, width: 600, depth: 1 });
    expect(byLabel.get('B')).toMatchObject({ x: 600, width: 300, depth: 1 });
  });

  it('puts the children of a child inside the width of that child', () => {
    const root = node('Root', 0, [node('Mid', 50, [node('Leaf', 50)]), node('Other', 100)]);

    const boxes = layoutPlanTree(root, 400, 4);
    const byLabel = new Map(boxes.map((box) => [box.node.label, box]));

    expect(byLabel.get('Mid')).toMatchObject({ x: 0, width: 200 });
    // Mid used half of its own width itself, so its child covers the other half.
    expect(byLabel.get('Leaf')).toMatchObject({ x: 0, width: 100, depth: 2 });
    expect(byLabel.get('Other')).toMatchObject({ x: 200, width: 200 });
  });

  it('keeps a node that took no time as a thin box, and shrinks everything if they add up too much', () => {
    const quiet = node('Quiet', 0, [node('Quieter', 0)]);
    const boxes = layoutPlanTree(node('Root', 0, [node('Busy', 100), quiet]), 100, 10);
    const byLabel = new Map(boxes.map((box) => [box.node.label, box]));

    // Busy would take all 100, and Quiet needs 10 more, so both are scaled to fit.
    expect(byLabel.get('Busy')?.width).toBeCloseTo(100 * (100 / 110));
    expect(byLabel.get('Quiet')?.width).toBeCloseTo(10 * (100 / 110));
    expect(byLabel.get('Quieter')?.width).toBeLessThanOrEqual(byLabel.get('Quiet')?.width ?? 0);
    const total = (byLabel.get('Busy')?.width ?? 0) + (byLabel.get('Quiet')?.width ?? 0);
    expect(total).toBeCloseTo(100);
  });

  it('draws a plan with no time at all, with every node the same thin width', () => {
    const boxes = layoutPlanTree(node('Root', 0, [node('A', 0), node('B', 0)]), 100, 5);

    expect(boxes.map((box) => Math.round(box.width))).toEqual([100, 5, 5]);
  });
});

describe('planDepth', () => {
  it('counts the rows the boxes need', () => {
    const boxes = layoutPlanTree(node('Root', 0, [node('A', 1, [node('B', 1)])]), 100, 5);

    expect(planDepth(boxes)).toBe(3);
    expect(planDepth([])).toBe(0);
  });
});
