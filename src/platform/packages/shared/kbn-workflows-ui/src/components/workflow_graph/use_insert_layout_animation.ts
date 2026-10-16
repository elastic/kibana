/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node } from '@xyflow/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/** How long existing nodes slide to make room for an inserted step. */
export const INSERT_LAYOUT_MS = 300;

/** Border flash on the inserted node after the slide completes. */
export const INSERT_FLASH_MS = 900;

const POSITION_EPSILON = 0.5;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Position {
  readonly x: number;
  readonly y: number;
}

/** Invisible structural nodes (empty-branch lanes, joins) that an insert may replace. */
const BYPASS_LANE_TYPE = 'bypassLane';

interface TrackedNode extends Position {
  readonly isBypassLane: boolean;
}

function sameNodeIds(a: readonly Node[], b: readonly Node[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((n) => n.id));
  return b.every((n) => ids.has(n.id));
}

/**
 * After a step insert (`flashNodeId` set), interpolates existing node positions
 * from their previous layout to the new one so downstream steps slide along the
 * rank axis (TB → y, LR → x — both axes are interpolated so forks stay coherent).
 * New edges into/out of the inserted node get a draw-in flag; the flash border
 * is delayed until the slide finishes.
 *
 * Slide also starts when a new node appears and peers move before `flashNodeId`
 * arrives (Redux yaml update can paint one frame ahead of local flash state).
 *
 * A slide only runs for a genuine insert: a new node appeared, peers moved and no real
 * step vanished. Swapping to an unrelated graph that merely shares a node id (e.g. the
 * trigger) therefore snaps instead of sliding.
 */
export function useInsertLayoutAnimation({
  nodes,
  edges,
  flashNodeId,
}: {
  readonly nodes: Node[];
  readonly edges: Edge[];
  readonly flashNodeId?: string;
}): {
  readonly nodes: Node[];
  readonly edges: Edge[];
  readonly isSliding: boolean;
} {
  const prevPositionsRef = useRef<Map<string, TrackedNode>>(new Map());
  const [displayNodes, setDisplayNodes] = useState(nodes);
  // Ids of the nodes inserted by the running slide; `null` when not sliding.
  const [insertedIds, setInsertedIds] = useState<ReadonlySet<string> | null>(null);
  const isSliding = insertedIds !== null;
  // Mirrors `isSliding` for effects so ending a slide that is not running sets no state.
  const slidingRef = useRef(false);
  const [flashReady, setFlashReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  /** Bumps on every effect run so a stale RAF cannot call finish after cleanup. */
  const slideGenRef = useRef(0);

  // Delay the border flash until the slide completes.
  useEffect(() => {
    if (!flashNodeId || prefersReducedMotion()) {
      setFlashReady(Boolean(flashNodeId));
      return;
    }
    setFlashReady(false);
    const timer = window.setTimeout(() => setFlashReady(true), INSERT_LAYOUT_MS);
    return () => window.clearTimeout(timer);
  }, [flashNodeId]);

  useLayoutEffect(() => {
    const prev = prevPositionsRef.current;
    const nextPositions = new Map<string, TrackedNode>();
    for (const n of nodes) {
      nextPositions.set(n.id, {
        x: n.position.x,
        y: n.position.y,
        isBypassLane: n.type === BYPASS_LANE_TYPE,
      });
    }

    const slideGen = ++slideGenRef.current;

    const endSlide = () => {
      if (!slidingRef.current) return;
      slidingRef.current = false;
      setInsertedIds(null);
    };

    // Not sliding → `nodes` render directly, so there is no display state to sync.
    const finish = () => {
      if (slideGen !== slideGenRef.current) return;
      prevPositionsRef.current = nextPositions;
      endSlide();
    };

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (prefersReducedMotion() || prev.size === 0) {
      finish();
      return;
    }

    const newIds = new Set<string>();
    for (const n of nodes) {
      if (!prev.has(n.id)) newIds.add(n.id);
    }

    const anyMoved = nodes.some((n) => {
      const old = prev.get(n.id);
      return (
        old !== undefined &&
        (Math.abs(old.x - n.position.x) > POSITION_EPSILON ||
          Math.abs(old.y - n.position.y) > POSITION_EPSILON)
      );
    });

    // A removed real step means a different graph (workflow switch), not an insert.
    // Removed bypass lanes are fine: inserting into an empty branch replaces its lane.
    let removedRealNode = false;
    for (const [id, old] of prev) {
      if (!nextPositions.has(id) && !old.isBypassLane) {
        removedRealNode = true;
        break;
      }
    }

    // Mid-flow insert: a new node appeared and existing peers shifted.
    // Flash id is optional here so a Redux-first paint still slides.
    const shouldSlide = newIds.size > 0 && anyMoved && !removedRealNode;

    if (!shouldSlide) {
      finish();
      return;
    }

    slidingRef.current = true;
    setInsertedIds(newIds);
    const startNodes = nodes.map((n) => {
      const old = prev.get(n.id);
      if (!old) return n;
      return { ...n, position: { x: old.x, y: old.y } };
    });
    setDisplayNodes(startNodes);

    const startedAt = performance.now();
    const tick = (now: number) => {
      if (slideGen !== slideGenRef.current) return;
      const t = Math.min(1, (now - startedAt) / INSERT_LAYOUT_MS);
      const eased = easeOutCubic(t);
      setDisplayNodes(
        nodes.map((n) => {
          const old = prev.get(n.id);
          if (!old) return n;
          return {
            ...n,
            position: {
              x: old.x + (n.position.x - old.x) * eased,
              y: old.y + (n.position.y - old.y) * eased,
            },
          };
        })
      );
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        finish();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      slideGenRef.current += 1;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        // Snap to this effect's target so a re-run never leaves nodes mid-tween.
        prevPositionsRef.current = nextPositions;
      }
      // Always end sliding — a completed RAF nulls rafRef before finish()'s
      // setState flushes, and a parent update can tear down this effect in that
      // window, leaving edges on draw-in forever.
      endSlide();
    };
  }, [nodes]);

  // While sliding, render the tweened positions. If state is briefly behind the
  // latest layout (new node id not in displayNodes yet), prefer `nodes` so React Flow
  // can resolve edge endpoints — missing nodes make edges drop out of the graph.
  // Otherwise render `nodes` directly so identity changes need no extra state sync.
  const nodesForRender = useMemo(
    () => (isSliding && sameNodeIds(displayNodes, nodes) ? displayNodes : nodes),
    [isSliding, displayNodes, nodes]
  );

  const animatedNodes = useMemo(() => {
    if (!flashNodeId || !flashReady) return nodesForRender;
    return nodesForRender.map((n) => {
      if (n.id !== flashNodeId) return n;
      return {
        ...n,
        data: { ...n.data, flash: true },
      };
    });
  }, [nodesForRender, flashNodeId, flashReady]);

  const animatedEdges = useMemo(() => {
    if (!insertedIds) return edges;
    return edges.map((edge) => {
      const edgeData = (edge.data ?? {}) as Record<string, unknown> & {
        hideEndMarker?: boolean;
      };
      // Bypass-lane target edges (hideEndMarker=true) target invisible 1×1
      // placeholder nodes. Skipping drawIn avoids the progressive-reveal
      // animation on structural placeholders.
      if (edgeData.hideEndMarker) {
        return edge;
      }
      const drawIn = insertedIds.has(edge.source) || insertedIds.has(edge.target);
      return {
        ...edge,
        data: {
          ...edgeData,
          ...(drawIn ? { drawIn: true } : {}),
        },
      };
    });
  }, [edges, insertedIds]);

  return { nodes: animatedNodes, edges: animatedEdges, isSliding };
}
