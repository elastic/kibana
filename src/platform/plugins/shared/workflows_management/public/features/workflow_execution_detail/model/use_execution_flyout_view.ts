/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux-v7';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { isInProgressStatus } from '@kbn/workflows';
import { areStepExecutionsUnavailable } from '../../../../common';
import { selectStepExecutionsTotal } from '../../../entities/workflows/store/workflow_detail/selectors';

export type FlyoutTabId = 'table' | 'json';

interface UseExecutionFlyoutViewParams {
  activeTab: FlyoutTabId;
  error: Error | null;
  workflowExecution: WorkflowExecutionDto | undefined;
  /** Overrides the name and tags carried by the execution when given. */
  workflowNameProp: string | undefined;
  workflowTagsProp: string[] | undefined;
}

interface ExecutionFlyoutView {
  workflowName: string;
  workflowTags: string[];
  stepExecutionsTotal: ReturnType<typeof selectStepExecutionsTotal>;
  /** The step tree is shown instead of the JSON whenever the JSON could not be complete. */
  showStepExecutionTree: boolean;
  executionJson: string;
}

/** What the flyout shows for a run: its name and tags, and the step tree or the raw JSON. */
export const useExecutionFlyoutView = ({
  activeTab,
  error,
  workflowExecution,
  workflowNameProp,
  workflowTagsProp,
}: UseExecutionFlyoutViewParams): ExecutionFlyoutView => {
  const stepExecutionsTotal = useSelector(selectStepExecutionsTotal);
  const stepExecutionsUnavailable = areStepExecutionsUnavailable({
    stepExecutionsTotal,
    loadedCount: workflowExecution?.stepExecutions.length ?? 0,
    isInProgress: workflowExecution ? isInProgressStatus(workflowExecution.status) : false,
  });
  const showStepExecutionTree =
    activeTab === 'table' || error !== null || stepExecutionsUnavailable;
  // Monaco renders only the visible lines, so a run with thousands of loaded steps stays usable.
  // Only stringify while the JSON tab is showing; the Table tab re-renders on every poll.
  const executionJson = useMemo(
    () =>
      !showStepExecutionTree && workflowExecution ? JSON.stringify(workflowExecution, null, 2) : '',
    [showStepExecutionTree, workflowExecution]
  );

  const workflowName =
    workflowNameProp ||
    workflowExecution?.workflowName ||
    workflowExecution?.workflowDefinition?.name ||
    workflowExecution?.workflowId ||
    '';
  const workflowTags = workflowTagsProp ?? workflowExecution?.workflowDefinition?.tags ?? [];

  return { workflowName, workflowTags, stepExecutionsTotal, showStepExecutionTree, executionJson };
};
