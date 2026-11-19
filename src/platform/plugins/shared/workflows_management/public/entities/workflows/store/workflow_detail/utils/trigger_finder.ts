/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_GRAPH_FOCUS_TRIGGER } from '@kbn/workflows';
import type { WorkflowLookup } from './build_workflow_lookup';
import { findStepByLine } from './step_finder';

/**
 * Returns true when `lineNumber` falls within the triggers block in the YAML
 * editor. The triggers block starts at `workflowLookup.triggersLineStart` and
 * extends up to (but not including) `workflowLookup.stepsLineStart`. When
 * there are no steps the block is treated as open-ended.
 *
 * Returns false when `triggersLineStart` is not set (no trigger block found).
 */
export const isLineInTriggers = (lineNumber: number, workflowLookup: WorkflowLookup): boolean => {
  if (workflowLookup?.triggersLineStart == null) {
    return false;
  }
  const firstStepLine = workflowLookup.stepsLineStart ?? Infinity;
  return lineNumber >= workflowLookup.triggersLineStart && lineNumber < firstStepLine;
};

/**
 * Resolves which step or trigger block the cursor's `lineNumber` is in.
 * Enforces the mutual-exclusion invariant: at most one of `focusedStepId` /
 * `focusedTriggerId` is non-null at any time.
 */
export const resolveFocusForLine = (
  lineNumber: number,
  workflowLookup: WorkflowLookup
): { focusedStepId: string | undefined; focusedTriggerId: string | undefined } => {
  if (isLineInTriggers(lineNumber, workflowLookup)) {
    return { focusedStepId: undefined, focusedTriggerId: WORKFLOW_GRAPH_FOCUS_TRIGGER };
  }
  return { focusedStepId: findStepByLine(lineNumber, workflowLookup), focusedTriggerId: undefined };
};
