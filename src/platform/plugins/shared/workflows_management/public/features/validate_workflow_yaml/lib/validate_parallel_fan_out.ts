/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LineCounter } from 'yaml';
import { DEFAULT_PARALLEL_MAX_FAN_OUT } from '@kbn/workflows';
import {
  getValueFromValueNode,
  type WorkflowLookup,
} from '../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';
import type { YamlValidationResult } from '../model/types';

const PARALLEL_STEP_TYPE = 'parallel';

/**
 * Warns when a dynamic `parallel` step (`foreach` over a runtime list) fans out
 * without an explicit `concurrency` cap. A missing cap means the engine's default
 * applies, which can still spike resource usage for large lists, so authors are
 * nudged to set an intentional limit. Static `branches` steps have a fixed,
 * author-known branch set and are intentionally skipped.
 */
export function validateParallelFanOut(
  workflowLookup: WorkflowLookup,
  lineCounter: LineCounter
): YamlValidationResult[] {
  const results: YamlValidationResult[] = [];

  for (const step of Object.values(workflowLookup.steps)) {
    // Only the dynamic fan-out mode (`foreach` over a runtime list) has unbounded
    // concurrency concerns. A static `branches` step has a fixed, author-known set
    // of branches, so neither the concurrency-cap nudge nor the fan-out-size check
    // applies; skip it to avoid noisy, irrelevant warnings.
    const isStaticBranches = Object.values(step.propInfos).some(
      (propInfo) => propInfo.path[0] === 'branches'
    );
    const isParallel = step.stepType === PARALLEL_STEP_TYPE && !isStaticBranches;
    // `propInfos` is keyed by dotted leaf path, so an object form like
    // `concurrency: { max: 3 }` is stored under `concurrency.max` (no bare
    // `concurrency` key). Detect both the object form and the shorthand bare
    // number (`concurrency: 5`, stored under `concurrency`) by matching the
    // property path root rather than an exact key.
    const hasConcurrency = Object.values(step.propInfos).some(
      (propInfo) => propInfo.path[0] === 'concurrency'
    );
    // Anchor the warning to the `type: parallel` line so it is easy to locate.
    const typeProp = step.propInfos.type;

    if (isParallel && !hasConcurrency && typeProp?.valueNode.range) {
      const [startOffset, endOffset] = typeProp.valueNode.range;
      const startPos = lineCounter.linePos(startOffset);
      const endPos = lineCounter.linePos(endOffset);

      results.push({
        id: `parallel-fan-out-${step.stepId}-${startPos.line}-${startPos.col}`,
        owner: 'parallel-fan-out-validation',
        severity: 'warning',
        message:
          `Parallel step "${step.stepId}" has no "concurrency" limit. ` +
          `Large runtime lists can fan out into many concurrent branches; ` +
          `set "concurrency" (e.g. { max: 5 }) to bound resource usage.`,
        hoverMessage: null,
        startLineNumber: startPos.line,
        startColumn: startPos.col,
        endLineNumber: endPos.line,
        endColumn: endPos.col,
      });
    }

    // When `foreach` is a literal array (knowable at author time), warn if its
    // length exceeds the fan-out ceiling instead of only failing at runtime. The
    // ceiling is operator-configurable server-side, so we use the package default
    // and emit a *warning* (not a hard error) to avoid blocking a workflow an
    // operator has raised the limit for.
    if (isParallel) {
      const foreachProp = Object.values(step.propInfos).find(
        (propInfo) => propInfo.path.length === 1 && propInfo.path[0] === 'foreach'
      );
      const foreachValue = foreachProp ? getValueFromValueNode(foreachProp.valueNode) : undefined;
      if (
        Array.isArray(foreachValue) &&
        foreachValue.length > DEFAULT_PARALLEL_MAX_FAN_OUT &&
        foreachProp?.valueNode.range
      ) {
        const [startOffset, endOffset] = foreachProp.valueNode.range;
        const startPos = lineCounter.linePos(startOffset);
        const endPos = lineCounter.linePos(endOffset);

        results.push({
          id: `parallel-fan-out-size-${step.stepId}-${startPos.line}-${startPos.col}`,
          owner: 'parallel-fan-out-validation',
          severity: 'warning',
          message:
            `Parallel step "${step.stepId}" fans out over ${foreachValue.length} items, ` +
            `which exceeds the default maximum of ${DEFAULT_PARALLEL_MAX_FAN_OUT}. ` +
            `The run will fail unless an operator has raised the fan-out limit; ` +
            `reduce the list size.`,
          hoverMessage: null,
          startLineNumber: startPos.line,
          startColumn: startPos.col,
          endLineNumber: endPos.line,
          endColumn: endPos.col,
        });
      }
    }
  }

  return results;
}
