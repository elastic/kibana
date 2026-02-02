/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  StepPropInfo,
  WorkflowLookup,
} from '../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

export function getFocusedYamlPair(
  workflowLookup: WorkflowLookup | undefined,
  focusedStepId: string | undefined,
  absolutePosition: number
): StepPropInfo | null {
  if (!workflowLookup || !focusedStepId) {
    return null;
  }

  const focusedStepInfo = workflowLookup.steps[focusedStepId];
  if (!focusedStepInfo) {
    return null;
  }

  const focusedProp: StepPropInfo | undefined = Object.entries(focusedStepInfo.propInfos)
    .map(([, stepPropInfo]) => stepPropInfo)
    .find(
      (stepPropInfo) =>
        stepPropInfo.valueNode &&
        stepPropInfo.valueNode.range &&
        stepPropInfo.valueNode.range[0] <= absolutePosition &&
        absolutePosition <= stepPropInfo.valueNode.range[2]
    );

  return focusedProp ?? null;
}
