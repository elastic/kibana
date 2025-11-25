/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import type { WorkflowLookup } from './build_workflow_lookup';

export function findStepByLine(
  lineNumber: number,
  workflowMetadata: WorkflowLookup
): string | undefined {
  if (!workflowMetadata) {
    return;
  }

  return Object.values(workflowMetadata.steps!).find(
    (stepIfo) => stepIfo.lineStart <= lineNumber && lineNumber <= stepIfo.lineEnd
  )?.stepId;
}
