/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import type { GraphBuildErrorInfo } from '../../../entities/workflows/store/workflow_detail/types';
import type { WorkflowLookup } from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

/**
 * Surfaces a graph-build failure (compiling the parsed workflow definition into
 * its execution graph) as a precise editor marker. The YAML itself is valid, so
 * the schema/structure validators report nothing — without this, the only signal
 * would be the generic "document not loaded" fallback shown at Ln 0, Col 0.
 *
 * When the error carries a `stepId`, the marker is anchored to that step (its
 * `type:` line when known, otherwise its first line) so the author sees the real
 * message ("…not supported inside a parallel branch yet") on the offending step.
 * Without a `stepId`, the marker falls back to the top of the document.
 */
export function validateGraphBuild(
  graphBuildError: GraphBuildErrorInfo | undefined,
  workflowLookup: WorkflowLookup | undefined,
  lineCounter: LineCounter | undefined
): YamlValidationResult[] {
  if (!graphBuildError) {
    return [];
  }

  const { message, stepId } = graphBuildError;
  const step = stepId ? workflowLookup?.steps[stepId] : undefined;
  const typeRange = step?.propInfos.type?.valueNode.range;

  let startLineNumber = 1;
  let startColumn = 1;
  let endLineNumber = 1;
  let endColumn = 1;

  if (typeRange && lineCounter) {
    // Anchor to the `type: <flow-control>` value for a tight squiggle.
    const startPos = lineCounter.linePos(typeRange[0]);
    const endPos = lineCounter.linePos(typeRange[1]);
    startLineNumber = startPos.line;
    startColumn = startPos.col;
    endLineNumber = endPos.line;
    endColumn = endPos.col;
  } else if (step) {
    // No `type` prop range available — anchor to the step's first line.
    startLineNumber = step.lineStart;
    endLineNumber = step.lineStart;
  }

  return [
    {
      id: `graph-build-${stepId ?? 'workflow'}-${startLineNumber}-${startColumn}`,
      owner: 'graph-build-validation',
      severity: 'error',
      message,
      hoverMessage: null,
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
    },
  ];
}
