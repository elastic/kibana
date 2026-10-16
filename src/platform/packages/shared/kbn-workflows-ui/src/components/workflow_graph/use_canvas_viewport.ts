/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type Node,
  type ReactFlowInstance,
  useNodesInitialized,
  useStore,
  type Viewport,
} from '@xyflow/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { LayoutDirection } from '@kbn/workflows';
import {
  boundsFromNodes,
  EMPTY_GRAPH_BOUNDS,
  getHomeFrameBounds,
  getResetViewTarget,
  type GraphBounds,
  INITIAL_ZOOM,
} from './viewport_framing';

interface UseCanvasViewportParams {
  /** Stable layout output (not the selection-decorated nodes). */
  readonly nodes: readonly Node[];
  readonly direction: LayoutDirection;
  readonly hasWorkflowStructure: boolean;
  readonly fitView: boolean;
  readonly fitViewOptions:
    | {
        readonly padding?: number;
        readonly minZoom?: number;
        readonly maxZoom?: number;
      }
    | undefined;
  readonly defaultViewport: Viewport | undefined;
  readonly selectedNodePanelInset: number | undefined;
  /** Node to keep visible beside the floating config panel. */
  readonly panelFocusNodeId: string | undefined;
  readonly onReady: (() => void) | undefined;
}

interface UseCanvasViewportResult {
  readonly wrapperRef: React.MutableRefObject<HTMLDivElement | null>;
  readonly handleInit: (instance: ReactFlowInstance) => void;
  readonly handleResetView: () => void;
  readonly handleFitView: () => void;
}

/**
 * Owns the canvas viewport state machine: panel-focus panning, initial / first
 * structure centering, direction-change reframing, reset / fit handlers and the
 * one-shot `onReady` signal. Effects run in declaration order.
 */
export const useCanvasViewport = ({
  nodes,
  direction,
  hasWorkflowStructure,
  fitView: fitViewProp,
  fitViewOptions: fitViewOptionsProp,
  defaultViewport,
  selectedNodePanelInset,
  panelFocusNodeId,
  onReady,
}: UseCanvasViewportParams): UseCanvasViewportResult => {
  // Single-pass bounding-box over the stable layout output (`nodes`, not
  // `decoratedNodes`) so that selection changes never invalidate fit/reset
  // viewport callbacks. `Math.min/max(...arr.map(...))` is avoided: spreading
  // large arrays as call args can raise RangeError on very big graphs.
  const graphBounds = useMemo((): GraphBounds => {
    return boundsFromNodes(nodes) ?? EMPTY_GRAPH_BOUNDS;
  }, [nodes]);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Keep the selected node visible beside a floating config panel (right inset).
  useEffect(() => {
    if (!panelFocusNodeId || !selectedNodePanelInset || selectedNodePanelInset <= 0) return;
    const instance = flowInstanceRef.current;
    if (!instance) return;
    const node = instance.getNode(panelFocusNodeId);
    if (!node) return;
    const zoom = instance.getZoom();
    const w = node.measured?.width ?? node.width ?? 200;
    const h = node.measured?.height ?? node.height ?? 80;
    const centerX = node.position.x + w / 2;
    const centerY = node.position.y + h / 2;
    // Shift the viewport center so the node sits in the unobstructed left region.
    const panelFlowOffset = selectedNodePanelInset / (2 * zoom);
    instance.setCenter(centerX + panelFlowOffset, centerY, { zoom, duration: 220 });
  }, [panelFocusNodeId, selectedNodePanelInset]);

  // React Flow's `setCenter` derives the viewport from the store's container
  // `width`/`height`, which are 0 until its ResizeObserver measures the canvas
  // (usually *after* `onInit` fires). Subscribe to those measured dimensions so
  // the initial centering can wait until they are known.
  const measuredWidth = useStore((s) => s.width);
  const measuredHeight = useStore((s) => s.height);
  const nodesInitialized = useNodesInitialized();
  const hasCenteredInitialViewRef = useRef(false);
  const readySignalledRef = useRef(false);
  const signalReady = useCallback(() => {
    if (readySignalledRef.current) return;
    readySignalledRef.current = true;
    onReady?.();
  }, [onReady]);
  const [instanceReady, setInstanceReady] = useState(false);
  /**
   * When true, keep applying the home frame through panel-close / canvas resize
   * after the first trigger or step is added to an empty workflow.
   */
  const homeAfterFirstStructureRef = useRef(false);
  const hadWorkflowStructureRef = useRef(hasWorkflowStructure);

  // Single home-viewport implementation shared by initial centering, direction
  // changes, and the Reset zoom button. Frames the trigger rank at center-top
  // (TB) / center-left (LR) — see getHomeFrameBounds + getResetViewTarget.
  const applyHomeViewport = useCallback(
    (instance: ReactFlowInstance, duration: number) => {
      if (nodes.length === 0) return;
      // Prefer React Flow's measured store size (what setCenter uses) over the
      // wrapper ref — they can diverge briefly during fade-in mounts.
      const wrapperWidth = measuredWidth || wrapperRef.current?.clientWidth || 0;
      const wrapperHeight = measuredHeight || wrapperRef.current?.clientHeight || 0;
      const homeBounds = getHomeFrameBounds(nodes, graphBounds);
      const target = getResetViewTarget(direction, homeBounds, wrapperWidth, wrapperHeight);
      instance.setCenter(target.x, target.y, { zoom: INITIAL_ZOOM, duration });
    },
    [nodes, graphBounds, direction, measuredWidth, measuredHeight]
  );

  /**
   * True viewport center on the leading nodes — matches the empty-canvas draft
   * placement so the first saved trigger does not jump up to the home-frame top.
   */
  const applyCenteredViewport = useCallback(
    (instance: ReactFlowInstance, duration: number) => {
      if (nodes.length === 0) return;
      const homeBounds = getHomeFrameBounds(nodes, graphBounds);
      instance.setCenter(homeBounds.centerX, homeBounds.centerY, {
        zoom: INITIAL_ZOOM,
        duration,
      });
    },
    [nodes, graphBounds]
  );

  const handleResetView = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance) return;
    applyHomeViewport(instance, 200);
  }, [applyHomeViewport]);

  // Scales and pans the viewport to show every node. Uses fitBounds (direct
  // panZoom.setViewport call) rather than fitView (queued through BatchProvider +
  // React re-render cycle) so the viewport updates synchronously without any
  // interference from the outer ReactFlowProvider context.
  const handleFitView = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) return;

    instance.fitBounds(
      {
        x: graphBounds.minX,
        y: graphBounds.minY,
        width: graphBounds.maxX - graphBounds.minX,
        height: graphBounds.maxY - graphBounds.minY,
      },
      { duration: 200, padding: 0.08 }
    );
  }, [nodes.length, graphBounds]);

  // Record the instance and decide who owns the initial viewport. The default
  // centering is deferred to the measurement-gated effect below, because
  // `setCenter` needs the container dimensions React Flow has not measured yet
  // when `onInit` fires.
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      flowInstanceRef.current = instance;

      // When fitView is declarative (fitViewProp=true), ReactFlow handles the
      // viewport positioning internally before firing onInit. Just signal ready.
      if (fitViewProp) {
        hasCenteredInitialViewRef.current = true;
        signalReady();
        return;
      }

      // If the caller supplied a `defaultViewport`, React Flow has already
      // restored the user's previous zoom/pan — don't re-center over it.
      // (The store doesn't survive a remount of <ReactFlow>, so we can't
      // detect this from `instance.getViewport()`; the explicit prop is the
      // only reliable signal.)
      if (defaultViewport) {
        hasCenteredInitialViewRef.current = true;
        signalReady();
        return;
      }

      setInstanceReady(true);
    },
    [defaultViewport, fitViewProp, signalReady]
  );

  // Tracks whether we've ever seen an empty canvas this mount. Used so page-load
  // with existing structure still uses the Reset-zoom home frame, while empty →
  // first trigger uses true-center (matching the draft card).
  const sawEmptyCanvasRef = useRef(false);

  // Empty ↔ first trigger/step: arm a short centering window so we keep the
  // node where the draft sat (viewport center) after the config panel closes.
  useEffect(() => {
    if (!hasWorkflowStructure) {
      hasCenteredInitialViewRef.current = false;
      homeAfterFirstStructureRef.current = false;
      hadWorkflowStructureRef.current = false;
      sawEmptyCanvasRef.current = true;
      return;
    }
    if (sawEmptyCanvasRef.current && !hadWorkflowStructureRef.current) {
      homeAfterFirstStructureRef.current = true;
    }
  }, [hasWorkflowStructure]);

  // Empty → first structure: keep the node in the viewport center (same place as
  // the draft card). Do not use the Reset-zoom home frame here — that anchors
  // near the top and makes the first trigger jump up on save.
  useLayoutEffect(() => {
    if (!homeAfterFirstStructureRef.current || !instanceReady) {
      return;
    }
    if (selectedNodePanelInset && selectedNodePanelInset > 0) {
      return;
    }
    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) {
      return;
    }
    if (measuredWidth <= 0 || measuredHeight <= 0) {
      return;
    }

    hadWorkflowStructureRef.current = true;
    hasCenteredInitialViewRef.current = true;
    applyCenteredViewport(instance, 0);
    signalReady();
  }, [
    instanceReady,
    measuredWidth,
    measuredHeight,
    nodes.length,
    selectedNodePanelInset,
    applyCenteredViewport,
    signalReady,
  ]);

  // Re-center briefly after first structure so a late canvas resize (config panel
  // closing) does not shift the node away from where the draft was.
  useEffect(() => {
    if (!homeAfterFirstStructureRef.current) return undefined;
    if (selectedNodePanelInset && selectedNodePanelInset > 0) return undefined;
    if (!instanceReady || nodes.length === 0 || measuredWidth <= 0 || measuredHeight <= 0) {
      return undefined;
    }
    const instance = flowInstanceRef.current;
    if (!instance) return undefined;

    applyCenteredViewport(instance, 0);
    const settleTimer = setTimeout(() => {
      applyCenteredViewport(instance, 0);
      homeAfterFirstStructureRef.current = false;
    }, 400);
    return () => clearTimeout(settleTimer);
  }, [
    instanceReady,
    measuredWidth,
    measuredHeight,
    nodes.length,
    selectedNodePanelInset,
    applyCenteredViewport,
    hasWorkflowStructure,
  ]);

  // Perform the one-time initial centering when the page loads with structure
  // already present. Empty → first structure is handled above.
  useEffect(() => {
    if (homeAfterFirstStructureRef.current) {
      return;
    }
    if (hasCenteredInitialViewRef.current || !instanceReady) {
      return;
    }
    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) {
      return;
    }
    if (measuredWidth <= 0 || measuredHeight <= 0 || !nodesInitialized) {
      return;
    }

    hasCenteredInitialViewRef.current = true;
    hadWorkflowStructureRef.current = hasWorkflowStructure;
    applyHomeViewport(instance, 0);
    signalReady();
  }, [
    instanceReady,
    measuredWidth,
    measuredHeight,
    nodesInitialized,
    nodes.length,
    applyHomeViewport,
    signalReady,
    hasWorkflowStructure,
  ]);

  const previousDirectionRef = useRef(direction);
  useEffect(() => {
    if (previousDirectionRef.current === direction) {
      return;
    }
    previousDirectionRef.current = direction;

    const instance = flowInstanceRef.current;
    if (!instance || nodes.length === 0) {
      return;
    }

    // Wait for dagre positions to commit in React Flow before re-centering.
    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (fitViewProp) {
          void instance.fitView({
            padding: fitViewOptionsProp?.padding ?? 0.08,
            minZoom: fitViewOptionsProp?.minZoom ?? 0.2,
            maxZoom: fitViewOptionsProp?.maxZoom ?? 2,
            duration: 200,
          });
        } else {
          applyHomeViewport(instance, 200);
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) {
        cancelAnimationFrame(raf2);
      }
    };
  }, [direction, nodes.length, fitViewProp, fitViewOptionsProp, applyHomeViewport]);

  return { wrapperRef, handleInit, handleResetView, handleFitView };
};
