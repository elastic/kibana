/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Edge, Node } from '@xyflow/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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
 * While sliding, dagre waypoints are dropped so strokes follow live endpoints
 * (absolute final-layout points would render off-canvas mid-tween).
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
  const prevPositionsRef = useRef<Map<string, Position>>(new Map());
  const [displayNodes, setDisplayNodes] = useState(nodes);
  const [isSliding, setIsSliding] = useState(false);
  const [flashReady, setFlashReady] = useState(false);
  const rafRef = useRef<number | null>(null);
  const insertedIdsRef = useRef<Set<string>>(new Set());
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
    const nextPositions = new Map<string, Position>();
    for (const n of nodes) {
      nextPositions.set(n.id, { x: n.position.x, y: n.position.y });
    }

    const slideGen = ++slideGenRef.current;

    const finish = () => {
      if (slideGen !== slideGenRef.current) return;
      prevPositionsRef.current = nextPositions;
      setDisplayNodes(nodes);
      setIsSliding(false);
      insertedIdsRef.current = new Set();
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

    let anyMoved = false;
    for (const n of nodes) {
      const old = prev.get(n.id);
      if (!old) continue;
      if (
        Math.abs(old.x - n.position.x) > POSITION_EPSILON ||
        Math.abs(old.y - n.position.y) > POSITION_EPSILON
      ) {
        anyMoved = true;
        break;
      }
    }

    // Mid-flow insert: a new node appeared and existing peers shifted.
    // Flash id is optional here so a Redux-first paint still slides.
    const shouldSlide = newIds.size > 0 && anyMoved;

    if (!shouldSlide) {
      finish();
      return;
    }

    insertedIdsRef.current = newIds;
    setIsSliding(true);
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
        // Snap to this effect's target so a re-run never leaves nodes mid-tween
        // while edges still carry final-layout dagre waypoints (invisible paths).
        prevPositionsRef.current = nextPositions;
        setDisplayNodes(nodes);
        insertedIdsRef.current = new Set();
      }
      // Always clear sliding — a completed RAF nulls rafRef before finish()'s
      // setState flushes, and a parent update can tear down this effect in that
      // window, leaving edges on cleared waypoints / draw-in forever.
      setIsSliding(false);
    };
  }, [nodes]);

  // If state is briefly behind the latest layout (new node id not in
  // displayNodes yet), prefer `nodes` so React Flow can resolve edge
  // endpoints — missing nodes make edges drop out of the graph entirely.
  const nodesForRender = sameNodeIds(displayNodes, nodes) ? displayNodes : nodes;

  const animatedNodes = nodesForRender.map((n) => {
    if (!flashNodeId || n.id !== flashNodeId || !flashReady) return n;
    return {
      ...n,
      data: { ...n.data, flash: true },
    };
  });

  const animatedEdges = isSliding
    ? edges.map((edge) => {
        const targets = insertedIdsRef.current;
        const drawIn = targets.has(edge.source) || targets.has(edge.target);
        const { points: _drop, ...restData } = (edge.data ?? {}) as Record<string, unknown> & {
          points?: unknown;
        };
        return {
          ...edge,
          data: {
            ...restData,
            // Dagre waypoints are absolute coords for the *final* layout. While
            // nodes interpolate, those points no longer match endpoints and the
            // stroke can vanish off-canvas — fall back to smooth-step instead.
            ...(drawIn ? { drawIn: true } : {}),
          },
        };
      })
    : edges;

  return { nodes: animatedNodes, edges: animatedEdges, isSliding };
}
