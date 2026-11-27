/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDelayRender, EuiSkeletonRectangle } from '@elastic/eui';
import React from 'react';
import { GraphErrorBoundary } from './graph_error_boundary';
import type { WorkflowGraphCanvasProps } from './workflow_graph_canvas';

/**
 * The canvas (and everything edit-mode behind it) is large, and several surfaces render it: the
 * workflow editor, the template library and the agent builder preview. Every one of them goes
 * through THIS dynamic `import()`, so the canvas ships as a single on-demand chunk.
 *
 * Never import `./workflow_graph_canvas` as a value from anywhere else. A static import in a
 * chunk that also loads this boundary would put the canvas in 3+ chunks, and the optimizer then
 * promotes it into `shared-packages`, which is preloaded on every Kibana page.
 */
const loadCanvas = () => import('./workflow_graph_canvas');

const LazyWorkflowGraphCanvas = React.lazy(() =>
  loadCanvas().then((module) => ({ default: module.WorkflowGraphCanvasWithoutProvider }))
);

/**
 * Starts fetching the canvas chunk. Call it as early as the surface is known to be needed (for
 * example while the chunk of the component that renders the canvas is itself loading), so the
 * canvas appears without a second wait. Safe to call any number of times.
 */
export const preloadWorkflowGraphCanvas = (): Promise<unknown> => loadCanvas();

const CanvasSkeleton = () => (
  <EuiDelayRender delay={300}>
    <EuiSkeletonRectangle
      width="100%"
      height="100%"
      borderRadius="none"
      data-test-subj="workflowGraphCanvasLoading"
    />
  </EuiDelayRender>
);

/**
 * Same name and props as the canvas itself; consumers keep wrapping it in their own
 * `ReactFlowProvider`. Shows a delayed skeleton while the chunk loads and the existing graph error
 * callout if the chunk fails to load.
 */
export const WorkflowGraphCanvasWithoutProvider = (props: WorkflowGraphCanvasProps) => (
  <GraphErrorBoundary resetKeys={[]}>
    <React.Suspense fallback={<CanvasSkeleton />}>
      <LazyWorkflowGraphCanvas {...props} />
    </React.Suspense>
  </GraphErrorBoundary>
);
