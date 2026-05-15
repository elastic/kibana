/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNodesBounds } from '@xyflow/react';
import * as domtoimage from 'dom-to-image-more';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useSelector } from 'react-redux';
import type { WorkflowYaml } from '@kbn/workflows';
import { applyGraphLayout, transformWorkflowToGraph } from '@kbn/workflows';
import { WorkflowGraphCanvas } from '@kbn/workflows-ui';
import {
  selectEditorWorkflowDefinition,
  selectIsYamlSyntaxValid,
} from '../../entities/workflows/store/workflow_detail/selectors';

// Extra time (ms) after onReady fires to let the browser finish painting
// sub-pixel details before we hand off to dom-to-image-more.
const SETTLE_MS = 80;
const EXPORT_PAD = 80;
const EXPORT_MIN = 512;
const EXPORT_MAX = 4096;

function noop() {}

/**
 * Pre-compute the graph's bounding box from the dagre layout so the
 * off-screen host can be sized to match the content before any rendering.
 * Returns null when the workflow is empty (nothing to export).
 */
function computeExportSize(workflow: WorkflowYaml): { width: number; height: number } | null {
  const { nodes, edges, foreachGroups } = transformWorkflowToGraph(workflow);
  const { nodes: layoutedNodes } = applyGraphLayout(nodes, edges, foreachGroups);
  if (layoutedNodes.length === 0) return null;

  const rfNodes = layoutedNodes.map((n) => ({
    id: n.id,
    position: n.position,
    width: n.style.width,
    height: n.style.height,
  }));
  const bounds = getNodesBounds(rfNodes as Parameters<typeof getNodesBounds>[0]);
  if (bounds.width === 0 && bounds.height === 0) return null;

  return {
    width: Math.max(EXPORT_MIN, Math.min(EXPORT_MAX, Math.ceil(bounds.width + EXPORT_PAD * 2))),
    height: Math.max(EXPORT_MIN, Math.min(EXPORT_MAX, Math.ceil(bounds.height + EXPORT_PAD * 2))),
  };
}

/**
 * Returns an `exportPng` callback that renders the current workflow into an
 * isolated off-screen ReactFlow canvas and downloads a PNG sized to fit the
 * graph's natural footprint (clamped between 512 and 4096 px per side).
 *
 * The off-screen canvas is mounted once on the first export, kept alive for
 * subsequent exports (avoiding re-mount overhead), and torn down when the
 * component that owns this hook unmounts.
 */
export function useExportGraphPng() {
  const workflow = useSelector(selectEditorWorkflowDefinition) as WorkflowYaml | undefined;
  const isYamlValid = useSelector(selectIsYamlSyntaxValid) ?? true;

  const [isExporting, setIsExporting] = useState(false);

  // Portal host div and React root — created once, cleaned up on unmount.
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  // Resolves the current "wait for onReady" promise.
  const resolveReadyRef = useRef<(() => void) | null>(null);

  // Ensure the off-screen host div exists in the DOM.
  const getHost = useCallback(() => {
    if (!hostRef.current || !rootRef.current) {
      const host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      // position:fixed off the visible viewport. We deliberately avoid
      // opacity/transform/clip-path because each of those creates a new
      // stacking context, which causes children with z-index:-1 (the ReactFlow
      // edge layer) to paint behind the host's background and disappear.
      // position:fixed with a negative left still gives a real clientWidth /
      // clientHeight so ReactFlow's fitView calculates correctly.
      host.style.cssText = [
        'position:fixed',
        'top:0',
        'left:-99999px',
        'pointer-events:none',
        'background:#ffffff',
        'overflow:hidden',
      ].join(';');
      document.body.appendChild(host);
      hostRef.current = host;
      rootRef.current = createRoot(host);
    }
    return { host: hostRef.current, root: rootRef.current };
  }, []);

  // Tear down the portal on unmount.
  useEffect(() => {
    return () => {
      if (rootRef.current) {
        // React requires unmount to happen asynchronously after the render that
        // scheduled it; wrapping in setTimeout satisfies that constraint.
        const root = rootRef.current;
        setTimeout(() => root.unmount(), 0);
        rootRef.current = null;
      }
      hostRef.current?.remove();
      hostRef.current = null;
    };
  }, []);

  const exportPng = useCallback(async () => {
    if (!workflow || !isYamlValid) return;

    const exportSize = computeExportSize(workflow);
    if (!exportSize) return;
    const { width, height } = exportSize;

    setIsExporting(true);
    try {
      const { host, root } = getHost();

      // Resize the host to match the graph footprint before rendering so
      // ReactFlow's fitView sees the correct viewport dimensions.
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;

      // Promise that resolves when WorkflowGraphCanvas fires onReady.
      const readyPromise = new Promise<void>((resolve) => {
        resolveReadyRef.current = resolve;
      });

      // Render (or re-render with fresh workflow data) the isolated canvas.
      root.render(
        React.createElement(WorkflowGraphCanvas, {
          workflow,
          isYamlValid: true,
          onStepSelect: noop,
          colorMode: 'light',
          fitView: true,
          fitViewOptions: { padding: 0.1, minZoom: 0.05, maxZoom: 1 },
          showMinimap: false,
          showBackground: false,
          edgeZIndex: 0,
          onReady: () => resolveReadyRef.current?.(),
        })
      );

      await readyPromise;

      // Let the browser finish sub-pixel painting before capture.
      await new Promise<void>((resolve) => setTimeout(resolve, SETTLE_MS));

      const dataUrl: string | undefined = await domtoimage.toPng(host, {
        width,
        height,
        // ReactFlow v12 renders each edge as its own zero-sized <svg> with
        // overflow:visible. In the browser this works because the path
        // coordinates leak out via overflow. But dom-to-image-more wraps the
        // cloned DOM inside a <foreignObject>, which re-clips each SVG to its
        // nominal painted box — so only the first sibling SVG's content
        // survives serialisation. Setting explicit 100% dimensions on the
        // container and every per-edge SVG in the clone makes each one a
        // full-viewport SVG, so all paths render regardless of order.
        onclone: (clone: HTMLElement) => {
          const edgeContainer = clone.querySelector<HTMLElement>('.react-flow__edges');
          if (edgeContainer) {
            edgeContainer.style.width = '100%';
            edgeContainer.style.height = '100%';
          }
          clone.querySelectorAll<SVGSVGElement>('.react-flow__edges svg').forEach((svg) => {
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.width = '100%';
            svg.style.height = '100%';
          });
        },
      });

      if (dataUrl) {
        const link = document.createElement('a');
        link.download = 'workflow-graph.png';
        link.href = dataUrl;
        link.click();
      }
    } finally {
      setIsExporting(false);
    }
  }, [workflow, isYamlValid, getHost]);

  return { exportPng, isExporting };
}
