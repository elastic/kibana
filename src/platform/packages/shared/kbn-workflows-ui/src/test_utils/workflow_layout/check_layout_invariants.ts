/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphEdge, LayoutDirection, TransformResult } from '@kbn/workflows';
import { edgeLabelCrossSpan } from '../../components/workflow_graph/edge_label_metrics';
import type { LayoutSnapshot } from '../../components/workflow_graph/workflow_layout_pipeline';

/**
 * Layout rules the generated corpus must satisfy. The checker deliberately
 * re-derives forks, joins and container membership from the transform output
 * instead of reusing the layout passes' own helpers: an oracle that shares code
 * with the code under test cannot catch a mistake in that code.
 */
export type LayoutInvariant =
  | 'overlap'
  | 'containment'
  | 'forkOrder'
  | 'triggerOrder'
  | 'ownerCentred'
  | 'joinAligned'
  | 'chainStraight'
  | 'containerTight'
  | 'forkInterleave'
  | 'mergeDropClear'
  | 'labelClear';

export interface LayoutViolation {
  readonly invariant: LayoutInvariant;
  readonly detail: string;
}

interface Box {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Fork {
  readonly owner: string;
  /** Branch head node ids in YAML declaration order. */
  readonly heads: readonly string[];
  /** Every edge of the graph the fork lives in, so the join can be found. */
  readonly graphEdges: readonly GraphEdge[];
}

const OVERLAP_TOLERANCE = 1;
const CENTRE_TOLERANCE = 2;
/** Distance from the shared merge bus to the target, as drawn by `computeEdgePath`. */
const MERGE_BUS_TRUNK = 20;

const isBranchEdge = (edge: GraphEdge): boolean =>
  !edge.isFailure &&
  !edge.isRejoin &&
  (edge.branchType !== undefined || edge.branchIndex !== undefined);

const isSpineEdge = (edge: GraphEdge): boolean => !edge.isFailure && !edge.isRejoin;

/** Direct and nested members of every container, keyed by container id. */
const collectDescendants = (
  transformed: TransformResult
): ReadonlyMap<string, ReadonlySet<string>> => {
  const members = new Map<string, string[]>(
    transformed.foreachGroups.map((group) => [
      group.id,
      [...group.innerNodes.map((n) => n.id), ...group.bypassLaneNodes.map((n) => n.id)],
    ])
  );
  const resolved = new Map<string, Set<string>>();
  const resolve = (groupId: string): Set<string> => {
    const known = resolved.get(groupId);
    if (known) return known;
    const result = new Set<string>();
    resolved.set(groupId, result);
    for (const memberId of members.get(groupId) ?? []) {
      result.add(memberId);
      if (members.has(memberId)) {
        for (const nested of resolve(memberId)) result.add(nested);
      }
    }
    return result;
  };
  for (const groupId of members.keys()) resolve(groupId);
  return resolved;
};

/** Every fork of a graph: a source with two or more declared branch edges. */
const collectForks = (graphEdges: readonly GraphEdge[]): Fork[] => {
  const headsByOwner = new Map<string, string[]>();
  for (const edge of graphEdges) {
    if (isBranchEdge(edge)) {
      const heads = headsByOwner.get(edge.source);
      if (heads) heads.push(edge.target);
      else headsByOwner.set(edge.source, [edge.target]);
    }
  }
  return [...headsByOwner]
    .filter(([, heads]) => heads.length >= 2)
    .map(([owner, heads]) => ({ owner, heads, graphEdges }));
};

/**
 * The node where a fork's branches meet again: the single first node reachable
 * from two or more heads. Undefined for a trailing fork whose branches never meet.
 */
const findJoin = ({ heads, graphEdges }: Fork): string | undefined => {
  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  for (const edge of graphEdges.filter(isSpineEdge)) {
    successors.set(edge.source, [...(successors.get(edge.source) ?? []), edge.target]);
    predecessors.set(edge.target, [...(predecessors.get(edge.target) ?? []), edge.source]);
  }
  const reach = (start: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [start];
    for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
      if (!seen.has(id)) {
        seen.add(id);
        stack.push(...(successors.get(id) ?? []));
      }
    }
    return seen;
  };
  const reaches = heads.map(reach);
  const reachCount = new Map<string, number>();
  for (const reached of reaches) {
    for (const id of reached) reachCount.set(id, (reachCount.get(id) ?? 0) + 1);
  }
  const shared = new Set([...reachCount].filter(([, count]) => count >= 2).map(([id]) => id));
  const firstShared = [...shared].filter(
    (id) => !(predecessors.get(id) ?? []).some((pred) => shared.has(pred))
  );
  return firstShared.length === 1 ? firstShared[0] : undefined;
};

export const checkLayoutInvariants = ({
  transformed,
  layout,
  direction,
  compoundPadding,
}: {
  transformed: TransformResult;
  layout: LayoutSnapshot;
  direction: LayoutDirection;
  compoundPadding: { top: number; right: number; bottom: number; left: number };
}): LayoutViolation[] => {
  const violations: LayoutViolation[] = [];
  const boxById = new Map<string, Box>(layout.nodes.map((n) => [n.id, n]));
  const descendants = collectDescendants(transformed);
  const isCross = direction === 'TB';
  const crossCentre = (box: Box): number =>
    isCross ? box.x + box.width / 2 : box.y + box.height / 2;

  const report = (invariant: LayoutInvariant, detail: string): void => {
    violations.push({ invariant, detail });
  };

  // overlap: two boxes may only intersect when one is a container holding the other.
  for (let i = 0; i < layout.nodes.length; i++) {
    for (let j = i + 1; j < layout.nodes.length; j++) {
      const a = layout.nodes[i];
      const b = layout.nodes[j];
      const nested = descendants.get(a.id)?.has(b.id) || descendants.get(b.id)?.has(a.id);
      const intersects =
        a.x + OVERLAP_TOLERANCE < b.x + b.width &&
        a.x + a.width > b.x + OVERLAP_TOLERANCE &&
        a.y + OVERLAP_TOLERANCE < b.y + b.height &&
        a.y + a.height > b.y + OVERLAP_TOLERANCE;
      if (!nested && intersects) report('overlap', `${a.id} x ${b.id}`);
    }
  }

  // containment: a container box holds every descendant plus its padding.
  for (const [groupId, memberIds] of descendants) {
    const box = boxById.get(groupId);
    if (box) {
      for (const memberId of memberIds) {
        const member = boxById.get(memberId);
        if (
          member &&
          (member.x < box.x + compoundPadding.left - OVERLAP_TOLERANCE ||
            member.x + member.width >
              box.x + box.width - compoundPadding.right + OVERLAP_TOLERANCE ||
            member.y < box.y + compoundPadding.top - OVERLAP_TOLERANCE ||
            member.y + member.height >
              box.y + box.height - compoundPadding.bottom + OVERLAP_TOLERANCE)
        ) {
          report('containment', `${memberId} escapes ${groupId}`);
        }
      }
    }
  }

  // triggerOrder: triggers appear left to right (top to bottom in LR) in YAML order.
  const triggers = Object.entries(transformed.nodeRefs)
    .flatMap(([id, ref]) => (ref.kind === 'trigger' ? [{ id, index: ref.triggerIndex }] : []))
    .sort((a, b) => a.index - b.index);
  for (let i = 1; i < triggers.length; i++) {
    const prev = boxById.get(triggers[i - 1].id);
    const curr = boxById.get(triggers[i].id);
    if (prev && curr && crossCentre(curr) <= crossCentre(prev)) {
      report('triggerOrder', `${triggers[i].id} is not after ${triggers[i - 1].id}`);
    }
  }

  // forkOrder / ownerCentred / joinAligned, for the outer graph and every container body.
  const mergeStepIds = new Set(
    [...transformed.nodes, ...transformed.foreachGroups.flatMap((g) => g.innerNodes)]
      .filter((n) => n.data.stepType === 'merge')
      .map((n) => n.id)
  );
  const graphs: ReadonlyArray<readonly GraphEdge[]> = [
    transformed.edges,
    ...transformed.foreachGroups.map((group) => group.innerEdges),
  ];
  for (const graphEdges of graphs) {
    const forks = collectForks(graphEdges);
    const spineEdges = graphEdges.filter(isSpineEdge);
    // Ancestry follows failure edges into fallback lanes: a fork inside a lane belongs to
    // the branch of the step that owns the lane. Rejoin edges point back out and don't count.
    const successors = new Map<string, string[]>();
    for (const edge of graphEdges.filter((e) => !e.isRejoin)) {
      successors.set(edge.source, [...(successors.get(edge.source) ?? []), edge.target]);
    }
    const reachableFrom = (start: string): Set<string> => {
      const seen = new Set<string>();
      const stack = [start];
      for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
        if (!seen.has(id)) {
          seen.add(id);
          stack.push(...(successors.get(id) ?? []));
        }
      }
      return seen;
    };

    // Forks nested in each other can rejoin at the same node, which can sit on only
    // one owner's column: the outermost fork, whose owner no other of them reaches.
    const ownersByJoin = new Map<string, string[]>();
    for (const fork of forks) {
      const join = findJoin(fork);
      if (join) ownersByJoin.set(join, [...(ownersByJoin.get(join) ?? []), fork.owner]);
    }
    const outermostOwners = new Set(
      [...ownersByJoin.values()].flatMap((owners) =>
        owners.filter(
          (owner) => !owners.some((other) => reachableFrom(other).has(owner) && other !== owner)
        )
      )
    );

    for (const fork of forks) {
      const owner = boxById.get(fork.owner);
      const heads = fork.heads.map((id) => boxById.get(id));
      if (owner && heads.every((head): head is Box => head !== undefined)) {
        for (let i = 1; i < heads.length; i++) {
          if (crossCentre(heads[i]) <= crossCentre(heads[i - 1])) {
            report(
              'forkOrder',
              `${heads[i].id} is not after ${heads[i - 1].id} (fork ${fork.owner})`
            );
          }
        }

        const headCentres = heads.map(crossCentre);
        const midpoint = (Math.min(...headCentres) + Math.max(...headCentres)) / 2;
        if (Math.abs(crossCentre(owner) - midpoint) > CENTRE_TOLERANCE) {
          report(
            'ownerCentred',
            `${fork.owner} is ${Math.round(crossCentre(owner) - midpoint)}px off its branch heads`
          );
        }

        const joinId = findJoin(fork);
        const join = joinId ? boxById.get(joinId) : undefined;
        if (
          join &&
          outermostOwners.has(fork.owner) &&
          Math.abs(crossCentre(join) - crossCentre(owner)) > CENTRE_TOLERANCE
        ) {
          report(
            'joinAligned',
            `${join.id} is ${Math.round(crossCentre(join) - crossCentre(owner))}px off ${
              fork.owner
            }`
          );
        }
      }
    }

    // chainStraight: consecutive steps of one branch stay in one column. Forks and
    // joins are excluded: their edges are the buses, not chain links. So is the edge from
    // a `merge` step to its body, which hangs to the side of the step by design.
    const outCount = new Map<string, number>();
    const inCount = new Map<string, number>();
    for (const edge of spineEdges) {
      outCount.set(edge.source, (outCount.get(edge.source) ?? 0) + 1);
      inCount.set(edge.target, (inCount.get(edge.target) ?? 0) + 1);
    }
    for (const edge of spineEdges.filter((e) => !isBranchEdge(e) && !mergeStepIds.has(e.source))) {
      const source = boxById.get(edge.source);
      const target = boxById.get(edge.target);
      if (
        source &&
        target &&
        outCount.get(edge.source) === 1 &&
        inCount.get(edge.target) === 1 &&
        Math.abs(crossCentre(source) - crossCentre(target)) > CENTRE_TOLERANCE
      ) {
        report(
          'chainStraight',
          `${edge.source} -> ${edge.target} jogs ${Math.round(
            crossCentre(target) - crossCentre(source)
          )}px`
        );
      }
    }

    // forkInterleave: forks in different branches must not alternate their heads on
    // a shared row, or their buses overlap and the edges cannot be told apart.
    const mainRange = (box: Box): readonly [number, number] =>
      isCross ? [box.y, box.y + box.height] : [box.x, box.x + box.width];
    const placed = forks.flatMap((fork) => {
      const heads = fork.heads.flatMap((id) => {
        const head = boxById.get(id);
        return head ? [head] : [];
      });
      return heads.length === fork.heads.length
        ? [
            {
              owner: fork.owner,
              reach: reachableFrom(fork.owner),
              heads,
              band: [
                Math.min(...heads.map((h) => mainRange(h)[0])),
                Math.max(...heads.map((h) => mainRange(h)[1])),
              ] as const,
            },
          ]
        : [];
    });
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const unrelated = !a.reach.has(b.owner) && !b.reach.has(a.owner);
        const sharesRow = a.band[0] < b.band[1] && b.band[0] < a.band[1];
        if (unrelated && sharesRow) {
          const labels = [
            ...a.heads.map((head) => ({ cross: crossCentre(head), owner: a.owner })),
            ...b.heads.map((head) => ({ cross: crossCentre(head), owner: b.owner })),
          ]
            .sort((x, y) => x.cross - y.cross)
            .map((entry) => entry.owner);
          const alternations = labels.filter(
            (owner, index) => index > 0 && owner !== labels[index - 1]
          );
          if (alternations.length > 1) {
            report('forkInterleave', `${a.owner} and ${b.owner} alternate their branch heads`);
          }
        }
      }
    }
  }

  // containerTight: a container box hugs its body: the gap to the body's extent on each
  // side of the cross axis is exactly the padding, so there is no empty space and the
  // body is never pushed against one edge.
  const paddingStart = isCross ? compoundPadding.left : compoundPadding.top;
  const paddingEnd = isCross ? compoundPadding.right : compoundPadding.bottom;
  const crossStart = (box: Box): number => (isCross ? box.x : box.y);
  const crossEnd = (box: Box): number => (isCross ? box.x + box.width : box.y + box.height);
  for (const [groupId, memberIds] of descendants) {
    const container = boxById.get(groupId);
    const members = [...memberIds].flatMap((id) => {
      const member = boxById.get(id);
      return member ? [member] : [];
    });
    if (container && members.length > 0) {
      const startGap = Math.min(...members.map(crossStart)) - crossStart(container);
      const endGap = crossEnd(container) - Math.max(...members.map(crossEnd));
      if (
        Math.abs(startGap - paddingStart) > OVERLAP_TOLERANCE ||
        Math.abs(endGap - paddingEnd) > OVERLAP_TOLERANCE
      ) {
        report(
          'containerTight',
          `${groupId} has ${Math.round(startGap)}px / ${Math.round(
            endGap
          )}px around its body, expected ${paddingStart}px / ${paddingEnd}px`
        );
      }
    }
  }

  // mergeDropClear: a merge edge (fan-in) drops from its source to the bus just above its
  // target, then runs along the bus and into the target. Nothing but a container holding
  // the source may stand in that path, or the edge would run behind a node.
  const mainStart = (box: Box): number => (isCross ? box.y : box.x);
  const mainEnd = (box: Box): number => (isCross ? box.y + box.height : box.x + box.width);
  const at = (cross: number, main: number) =>
    isCross ? { x: cross, y: main } : { x: main, y: cross };
  const edgesOfAllGraphs = graphs.flat();
  const incomingCount = new Map<string, number>();
  for (const edge of edgesOfAllGraphs) {
    incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
  }
  for (const edge of edgesOfAllGraphs.filter((e) => (incomingCount.get(e.target) ?? 0) > 1)) {
    const source = boxById.get(edge.source);
    const target = boxById.get(edge.target);
    if (source && target && mainStart(target) - mainEnd(source) > MERGE_BUS_TRUNK) {
      const busMain = mainStart(target) - MERGE_BUS_TRUNK;
      const [from, down, across, into] = [
        at(crossCentre(source), mainEnd(source)),
        at(crossCentre(source), busMain),
        at(crossCentre(target), busMain),
        at(crossCentre(target), mainStart(target)),
      ];
      const path: Array<readonly [typeof from, typeof from]> = [
        [from, down],
        [down, across],
        [across, into],
      ];
      const blocker = layout.nodes.find(
        (n) =>
          n.id !== source.id &&
          n.id !== target.id &&
          n.width > 1 &&
          n.height > 1 &&
          !descendants.get(n.id)?.has(source.id) &&
          path.some(
            ([a, b]) =>
              Math.max(a.x, b.x) > n.x + 1 &&
              Math.min(a.x, b.x) < n.x + n.width - 1 &&
              Math.max(a.y, b.y) > n.y + 1 &&
              Math.min(a.y, b.y) < n.y + n.height - 1
          )
      );
      if (blocker)
        report('mergeDropClear', `${edge.source} -> ${edge.target} runs behind ${blocker.id}`);
    }
  }

  // labelClear: an empty branch is drawn as a bypass lane node under its edge label. The
  // node must be at least as wide as that label, or the label pokes out past it and runs
  // into whatever box or branch is next to it.
  const bypassIds = new Set([
    ...transformed.bypassLaneNodes.map((n) => n.id),
    ...transformed.foreachGroups.flatMap((g) => g.bypassLaneNodes.map((n) => n.id)),
  ]);
  for (const edge of graphs.flat()) {
    const bypass = boxById.get(edge.target);
    if (bypass && bypassIds.has(edge.target) && edge.label !== undefined) {
      const needed = edgeLabelCrossSpan(edge.label, direction);
      const span = isCross ? bypass.width : bypass.height;
      if (span < needed - OVERLAP_TOLERANCE) {
        report(
          'labelClear',
          `${edge.target} is ${Math.round(span)}px across, its label "${
            edge.label
          }" needs ${Math.round(needed)}px`
        );
      }
    }
  }

  return violations;
};
