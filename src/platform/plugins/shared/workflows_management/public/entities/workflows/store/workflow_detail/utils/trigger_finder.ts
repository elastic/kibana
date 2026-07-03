/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowLookup } from './build_workflow_lookup';

/**
 * Returns true when `lineNumber` falls within the triggers block in the YAML
 * editor. The triggers block starts at `workflowLookup.triggersLineStart` and
 * extends up to (but not including) the first step's `lineStart`. When there
 * are no steps the block is treated as open-ended.
 *
 * Returns false when `triggersLineStart` is not set (no trigger block found).
 */
export const isLineInTriggers = (lineNumber: number, workflowLookup: WorkflowLookup): boolean => {
  if (workflowLookup?.triggersLineStart == null) {
    return false;
  }
  const starts = Object.values(workflowLookup.steps).map((s) => s.lineStart);
  const firstStepLine = starts.length ? Math.min(...starts) : Infinity;
  return lineNumber >= workflowLookup.triggersLineStart && lineNumber < firstStepLine;
};
