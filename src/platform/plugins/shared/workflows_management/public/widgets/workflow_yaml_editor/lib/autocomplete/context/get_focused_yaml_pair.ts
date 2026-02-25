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

  const containingProps = Object.values(focusedStepInfo.propInfos).filter(
    (stepPropInfo) =>
      stepPropInfo.valueNode &&
      stepPropInfo.valueNode.range &&
      stepPropInfo.valueNode.range[0] <= absolutePosition &&
      absolutePosition <= stepPropInfo.valueNode.range[2]
  );

  if (containingProps.length === 0) return null;
  if (containingProps.length === 1) return containingProps[0];

  // Prefer the most specific (narrowest range) so we get the leaf value (e.g. with.message)
  // rather than a parent map (e.g. with) when the cursor is inside a scalar like "hey, this is @"
  const [first, ...rest] = containingProps;
  const narrowest = rest.reduce((best, prop) => {
    const range = prop.valueNode?.range;
    const bestRange = best.valueNode?.range;
    if (!range || range.length < 3) return best;
    if (!bestRange || bestRange.length < 3) return prop;
    const span = range[2] - range[0];
    const bestSpan = bestRange[2] - bestRange[0];
    return span < bestSpan ? prop : best;
  }, first);
  return narrowest;
}
