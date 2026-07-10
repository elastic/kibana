/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiProvider } from '@elastic/eui';
import React, { useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { WorkflowYaml } from '@kbn/workflows';
import { transformWorkflowToGraph } from '@kbn/workflows';
import { ReactFlowProvider, WorkflowGraphCanvasWithoutProvider } from '@kbn/workflows-ui';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import type { GraphConfig } from './page_template';

// Data injected by the server's HTML template via custom-element `data` attributes
// (see page_template.ts). Reading from attributes (rather than inline script globals)
// is safe even when YAML content contains `</script>` literals.
const yamlString: string = document.querySelector('kbn-workflow-yaml')?.getAttribute('data') ?? '';

const graphConfig: GraphConfig = JSON.parse(
  document.querySelector('kbn-graph-config')?.getAttribute('data') ?? '{"transparent":false}'
);

const parsed = parseYamlToJSONWithoutValidation(yamlString);
const workflow = parsed.success ? (parsed.json as unknown as WorkflowYaml) : undefined;
const isYamlValid = parsed.success;

// Pre-compute the transform result outside React so it is available
// synchronously on first render (no extra render cycle needed).
const transformed = transformWorkflowToGraph(workflow);

// Exposed so the Node-side driver can detect the "syntactically valid YAML,
// but not a workflow" case (e.g. missing/misnamed `steps`/`triggers`), which
// parses successfully yet transforms to a graph with no nodes at all.
(window as unknown as { __GRAPH_NODE_COUNT__: number }).__GRAPH_NODE_COUNT__ =
  transformed.nodes.length;

const NO_OP = () => {};

const GraphApp = () => {
  const handleReady = useCallback(() => {
    // Signal Playwright that the graph is fully laid out and ready to capture.
    (window as unknown as { __GRAPH_READY__: boolean }).__GRAPH_READY__ = true;
  }, []);

  return (
    <EuiProvider colorMode="light">
      <ReactFlowProvider>
        <WorkflowGraphCanvasWithoutProvider
          workflow={workflow}
          transformed={transformed}
          isYamlValid={isYamlValid}
          onStepSelect={NO_OP}
          direction={graphConfig.direction ?? 'TB'}
          fitView
          fitViewOptions={{ padding: 0.08, minZoom: 0.1, maxZoom: 2 }}
          showMinimap={false}
          showZoomControls={false}
          showBackground={!graphConfig.transparent}
          edgeZIndex={0}
          onReady={handleReady}
        />
      </ReactFlowProvider>
    </EuiProvider>
  );
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Mount point #root not found in DOM');
}

createRoot(root).render(<GraphApp />);
