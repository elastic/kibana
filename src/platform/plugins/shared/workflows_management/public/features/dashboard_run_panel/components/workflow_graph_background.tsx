/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import React, { useEffect, useState } from 'react';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ReactFlowProvider, WorkflowGraphCanvasWithoutProvider } from '@kbn/workflows-ui';

const FIT_VIEW_OPTIONS = { padding: 0.15, minZoom: 0.05, maxZoom: 1 } as const;

const layerCss = css`
  position: absolute;
  inset: 0;
  opacity: 0.6;
  pointer-events: none;
`;

const noop = () => {};

const RefitOnResize = ({ width, height }: { width: number; height: number }) => {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  useEffect(() => {
    if (nodesInitialized && width > 0 && height > 0) fitView(FIT_VIEW_OPTIONS);
  }, [fitView, nodesInitialized, width, height]);
  return null;
};

interface WorkflowGraphBackgroundProps {
  workflow: WorkflowYaml;
  isYamlValid: boolean;
  stepExecutions: WorkflowStepExecutionDto[] | undefined;
}

/** A non-interactive picture of the workflow graph, coloured by the step results of the shown run. */
export const WorkflowGraphBackground = ({
  workflow,
  isYamlValid,
  stepExecutions,
}: WorkflowGraphBackgroundProps): React.JSX.Element => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(container);

  return (
    <div ref={setContainer} css={layerCss} aria-hidden data-test-subj="workflowRunPanelGraph">
      <ReactFlowProvider>
        <WorkflowGraphCanvasWithoutProvider
          workflow={workflow}
          isYamlValid={isYamlValid}
          stepExecutions={stepExecutions}
          onStepSelect={noop}
          canRunSteps={false}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          showMinimap={false}
          showZoomControls={false}
          showBackground={false}
        />
        <RefitOnResize width={width} height={height} />
      </ReactFlowProvider>
    </div>
  );
};
