/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSeq } from 'yaml';
import type { LineCounter } from 'yaml';
import { PARALLEL_MODE_REFINEMENT_MESSAGE } from '@kbn/workflows';
import type {
  StepInfo,
  WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

const PARALLEL_STEP_TYPE = 'parallel';

/**
 * Flags a `parallel` step that violates the dynamic-vs-static mode rule, so the
 * error shows inline in the editor rather than only at run time.
 *
 * A parallel step must use exactly one mode: dynamic fan-out (`foreach` + a
 * `steps` body) or static `branches` (no top-level `steps`). The schema enforces
 * this via a Zod `.refine()`, but refinements are not expressible in JSON Schema,
 * so Monaco's schema-based validation cannot catch it — a workflow with both
 * `foreach` and `branches` passes the editor's schema check and only fails on
 * save/run with a confusing union-mismatch error. This validator mirrors the
 * refinement so the author sees the friendly reason as they type.
 */
/** Returns a mode-violation result for a single step, or undefined when valid. */
function validateStep(step: StepInfo, lineCounter: LineCounter): YamlValidationResult | undefined {
  if (step.stepType !== PARALLEL_STEP_TYPE) {
    return undefined;
  }

  const hasForeach = Object.values(step.propInfos).some(
    (propInfo) => propInfo.path.length === 1 && propInfo.path[0] === 'foreach'
  );
  const hasBranches = Object.values(step.propInfos).some(
    (propInfo) => propInfo.path[0] === 'branches'
  );
  // `steps` is excluded from `propInfos`, so read it off the step's YAML map.
  const stepsNode = step.stepYamlNode.get('steps', true);
  const hasSteps = isSeq(stepsNode) && stepsNode.items.length > 0;

  // Exactly one mode must be present, matching `parallelModeRefinement`:
  // - both `foreach` and `branches`, or neither, is invalid;
  // - dynamic (`foreach`) requires a non-empty `steps` body;
  // - static (`branches`) must omit top-level `steps`.
  const modeValid = hasForeach !== hasBranches && (hasForeach ? hasSteps : !hasSteps);
  if (modeValid) {
    return undefined;
  }

  // Anchor the error to the `type: parallel` line so it is easy to locate.
  const typeProp = step.propInfos.type;
  if (!typeProp?.valueNode.range) {
    return undefined;
  }

  const [startOffset, endOffset] = typeProp.valueNode.range;
  const startPos = lineCounter.linePos(startOffset);
  const endPos = lineCounter.linePos(endOffset);

  return {
    id: `parallel-mode-${step.stepId}-${startPos.line}-${startPos.col}`,
    owner: 'parallel-mode-validation',
    severity: 'error',
    message: PARALLEL_MODE_REFINEMENT_MESSAGE,
    hoverMessage: null,
    startLineNumber: startPos.line,
    startColumn: startPos.col,
    endLineNumber: endPos.line,
    endColumn: endPos.col,
  };
}

export function validateParallelMode(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  return Object.values(workflowLookup.steps)
    .map((step) => validateStep(step, lineCounter))
    .filter((result): result is YamlValidationResult => result !== undefined);
}
