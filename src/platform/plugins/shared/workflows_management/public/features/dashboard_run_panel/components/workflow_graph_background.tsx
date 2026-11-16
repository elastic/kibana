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
import React, { useEffect, useMemo, useState } from 'react';
import type { LayoutDirection, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { RenderStepIcon } from '@kbn/workflows-ui';
import {
  getWorkflowGraphSize,
  ReactFlowProvider,
  WorkflowGraphCanvasWithoutProvider,
} from '@kbn/workflows-ui';
import type { WorkflowRunGraphLayout } from '../../../../server/dashboard_run_panel/schema';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { getGraphDirection, GRAPH_MAX_ZOOM } from '../lib/get_graph_direction';

const FIT_VIEW_OPTIONS = { padding: 0.15, minZoom: 0.05, maxZoom: GRAPH_MAX_ZOOM } as const;

const layerCss = css`
  position: absolute;
  inset: 0;
  opacity: 0.6;
  pointer-events: none;
`;

const noop = () => {};

const renderStepIcon: RenderStepIcon = ({ stepType, color }) => (
  <StepIcon stepType={stepType} executionStatus={undefined} iconColor={color} />
);

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
  layout: WorkflowRunGraphLayout | undefined;
  holdDirection: boolean;
}

/** A non-interactive picture of the workflow graph, coloured by the step results of the shown run. */
export const WorkflowGraphBackground = ({
  workflow,
  isYamlValid,
  stepExecutions,
  layout,
  holdDirection,
}: WorkflowGraphBackgroundProps): React.JSX.Element => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { width, height } = useResizeObserver(container);
  const isAuto = layout === undefined || layout === 'auto';
  const graphSizes = useMemo(
    () =>
      isAuto
        ? { LR: getWorkflowGraphSize(workflow, 'LR'), TB: getWorkflowGraphSize(workflow, 'TB') }
        : undefined,
    [isAuto, workflow]
  );
  // The direction `auto` last chose for the measured panel; cleared while a fixed layout is set.
  const [autoDirection, setAutoDirection] = useState<LayoutDirection>();
  const direction = getGraphDirection(
    layout,
    { width, height },
    { graphSizes, current: isAuto ? autoDirection : undefined, hold: holdDirection }
  );
  if (!isAuto && autoDirection !== undefined) {
    setAutoDirection(undefined);
  } else if (isAuto && width > 0 && height > 0 && direction !== autoDirection) {
    setAutoDirection(direction);
  }

  return (
    <div
      ref={setContainer}
      css={layerCss}
      aria-hidden
      data-test-subj="workflowRunPanelGraph"
      data-direction={direction}
    >
      {/* Remounting on a direction change lets the new layout fit the panel again. */}
      <ReactFlowProvider key={direction}>
        <WorkflowGraphCanvasWithoutProvider
          workflow={workflow}
          isYamlValid={isYamlValid}
          stepExecutions={stepExecutions}
          onStepSelect={noop}
          canRunSteps={false}
          renderStepIcon={renderStepIcon}
          direction={direction}
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
