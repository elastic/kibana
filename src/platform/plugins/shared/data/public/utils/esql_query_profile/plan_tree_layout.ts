/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PlanNode } from './plan_tree';

export interface PlanBox {
  node: PlanNode;
  /** Rows below the root of what is drawn. */
  depth: number;
  x: number;
  width: number;
}

/**
 * Lays a plan out as an icicle: the root across the whole width, and under each node its children
 * side by side, as wide as the time of each of them. What a node used itself is the part of its
 * width that its children do not cover. A node with no time still gets a thin box, so the shape of
 * the plan is not lost.
 */
export function layoutPlanTree(root: PlanNode, width: number, minWidth: number): PlanBox[] {
  const boxes: PlanBox[] = [];

  const place = (node: PlanNode, x: number, boxWidth: number, depth: number) => {
    boxes.push({ node, depth, x, width: boxWidth });
    if (node.children.length === 0) {
      return;
    }

    const wanted = node.children.map((child) =>
      node.inclusiveNanos > 0 && child.inclusiveNanos > 0
        ? Math.max(minWidth, (boxWidth * child.inclusiveNanos) / node.inclusiveNanos)
        : minWidth
    );
    const total = wanted.reduce((sum, value) => sum + value, 0);
    // Thin boxes can add up to more than the node has, and then everything shrinks together.
    const scale = total > boxWidth ? boxWidth / total : 1;

    let cursor = x;
    node.children.forEach((child, index) => {
      const childWidth = wanted[index] * scale;
      place(child, cursor, childWidth, depth + 1);
      cursor += childWidth;
    });
  };

  place(root, 0, width, 0);
  return boxes;
}

/** How many rows a drawing of the boxes needs. */
export const planDepth = (boxes: PlanBox[]): number =>
  boxes.reduce((deepest, box) => Math.max(deepest, box.depth + 1), 0);
