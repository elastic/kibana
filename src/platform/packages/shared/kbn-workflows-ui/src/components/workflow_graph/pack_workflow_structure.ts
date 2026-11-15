/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DagPositionedNode } from '@kbn/dag-layout';
import type {
  LayoutDirection,
  LayoutStructure,
  StructureBranch,
  StructureContainer,
  StructureFork,
  StructureItem,
  StructureSequence,
} from '@kbn/workflows';
import { edgeLabelCrossSpan } from './edge_label_metrics';

/**
 * A packed piece of the graph: how far it reaches to either side of its spine column
 * on the cross axis, and how to place it once its spine position is known.
 */
interface Packed {
  readonly left: number;
  readonly right: number;
  readonly place: (spine: number) => void;
}

/**
 * Sets every cross-axis coordinate of a laid-out workflow from its block structure.
 *
 * The layout engine decides the main axis (rank positions, node sizes, container
 * heights); this decides the cross axis, so forks, containers and lanes follow from
 * the structure instead of being repaired after the fact. Bottom-up, each item
 * measures how far it reaches either side of its spine column:
 * - a sequence puts its items on one spine column;
 * - a fork puts its branches side by side in declaration order (each branch as one
 *   bounding box) with the owner on the midpoint of the outermost branch heads, so
 *   the item after the fork, on the same spine, is under the owner;
 * - a container is a tight box around its body (body extent plus padding) centred
 *   on the spine, so it never holds empty space and the body is never pushed to a side;
 * - a branch with no step of its own is a bypass lane node; it reserves room for its
 *   edge label, so the label never runs into the box around it;
 * - fallback lanes (and the body attached to a `merge` step) sit to the right of
 *   everything their owner reaches, further out for each nesting level;
 * - triggers form a centred row in declaration order above the first step.
 *
 * Pure: returns new nodes. Nodes the structure does not mention are returned as is.
 */
export const packCrossAxis = ({
  structure,
  nodes,
  direction,
  nodeSep,
  compoundPadding,
}: {
  structure: LayoutStructure;
  nodes: readonly DagPositionedNode[];
  direction: LayoutDirection;
  nodeSep: number;
  compoundPadding: { top: number; right: number; bottom: number; left: number };
}): DagPositionedNode[] => {
  const isTB = direction === 'TB';
  const paddingStart = isTB ? compoundPadding.left : compoundPadding.top;
  const paddingEnd = isTB ? compoundPadding.right : compoundPadding.bottom;
  const spanById = new Map(nodes.map((node) => [node.id, isTB ? node.width : node.height]));
  const spanOf = (id: string): number => spanById.get(id) ?? 0;

  const starts = new Map<string, number>();
  // Nodes whose cross span differs from the layout engine's: container boxes and bypass lanes.
  const resizedSpans = new Map<string, number>();

  const packNode = (id: string, span = spanOf(id)): Packed => {
    const half = span / 2;
    return {
      left: half,
      right: half,
      place: (spine) => {
        starts.set(id, spine - half);
      },
    };
  };

  /** Packs pieces side by side, one `nodeSep` apart, centred on the midpoint of the outer two. */
  const arrange = (pieces: readonly Packed[]): Packed => {
    const spines: number[] = [];
    pieces.forEach((piece, index) => {
      spines.push(
        index === 0 ? 0 : spines[index - 1] + pieces[index - 1].right + nodeSep + piece.left
      );
    });
    const last = pieces.length - 1;
    const midpoint = (spines[0] + spines[last]) / 2;
    return {
      left: midpoint - spines[0] + pieces[0].left,
      right: spines[last] + pieces[last].right - midpoint,
      place: (spine) =>
        pieces.forEach((piece, index) => piece.place(spine - midpoint + spines[index])),
    };
  };

  /**
   * Adds sequences to the right of `base`, each one `nodeSep` past what is already there
   * and past `clearance`, how far the items sharing its rows reach to the right.
   */
  const withSidesOnTheRight = (base: Packed, sides: readonly Packed[], clearance = 0): Packed => {
    let reach = Math.max(base.right, clearance);
    const spines = sides.map((side) => {
      const spine = reach + nodeSep + side.left;
      reach = spine + side.right;
      return spine;
    });
    return {
      left: base.left,
      right: reach,
      place: (spine) => {
        base.place(spine);
        sides.forEach((side, index) => side.place(spine + spines[index]));
      },
    };
  };

  const packBypass = ({ head, label }: StructureBranch): Packed => {
    const span = Math.max(spanOf(head), edgeLabelCrossSpan(label, direction));
    resizedSpans.set(head, span);
    return packNode(head, span);
  };

  const packSequence = (items: StructureSequence): Packed => {
    // The body of a `merge` step hangs off it, but the items after it start on the same
    // rows (nothing pushes them down, unlike a fallback lane), so it must clear them.
    // Packing back to front measures each item once, against the final reach of what follows.
    const packed: Packed[] = [];
    let followingReach = 0;
    [...items].reverse().forEach((item) => {
      const piece = packItem(item, item.kind === 'step' && item.attached ? followingReach : 0);
      packed.unshift(piece);
      followingReach = Math.max(followingReach, piece.right);
    });
    return {
      left: Math.max(0, ...packed.map((piece) => piece.left)),
      right: Math.max(0, ...packed.map((piece) => piece.right)),
      place: (spine) => packed.forEach((piece) => piece.place(spine)),
    };
  };

  const packFork = ({ id, branches }: StructureFork): Packed => {
    const row = arrange(
      branches.map((branch) =>
        branch.items.length > 0 ? packSequence(branch.items) : packBypass(branch)
      )
    );
    const half = spanOf(id) / 2;
    return {
      left: Math.max(half, row.left),
      right: Math.max(half, row.right),
      place: (spine) => {
        starts.set(id, spine - half);
        row.place(spine);
      },
    };
  };

  const packContainer = ({ id, body }: StructureContainer): Packed => {
    // An empty body has nothing to fit: keep the size the layout engine gave the box.
    if (body.length === 0) return packNode(id);
    const packedBody = packSequence(body);
    const width = packedBody.left + packedBody.right + paddingStart + paddingEnd;
    return {
      left: width / 2,
      right: width / 2,
      place: (spine) => {
        const start = spine - width / 2;
        starts.set(id, start);
        resizedSpans.set(id, width);
        packedBody.place(start + paddingStart + packedBody.left);
      },
    };
  };

  const packItem = (item: StructureItem, clearance = 0): Packed => {
    const lanes = item.lanes.map((lane) => packSequence(lane.items));
    switch (item.kind) {
      case 'step':
        return withSidesOnTheRight(
          packNode(item.id),
          [...lanes, ...(item.attached ? [packSequence(item.attached)] : [])],
          clearance
        );
      case 'fork':
        return withSidesOnTheRight(packFork(item), lanes);
      case 'container':
        return withSidesOnTheRight(packContainer(item), lanes);
    }
  };

  const triggerRow =
    structure.triggers.length > 0 ? [arrange(structure.triggers.map((id) => packNode(id)))] : [];
  const root = packSequence(structure.items);
  const pieces = [...triggerRow, root];
  const left = Math.max(...pieces.map((piece) => piece.left));
  pieces.forEach((piece) => piece.place(left));

  return nodes.map((node) => {
    const start = starts.get(node.id);
    if (start === undefined) return node;
    const span = resizedSpans.get(node.id);
    return isTB
      ? { ...node, x: start, ...(span === undefined ? {} : { width: span }) }
      : { ...node, y: start, ...(span === undefined ? {} : { height: span }) };
  });
};
