/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import type { StepInfo } from '@kbn/workflows-yaml';
import { formatDuration } from './format_duration';

export interface StepDuration {
  /** `executionTimeMs` summed over every counted run. Drives the chip colour. */
  totalMs: number;
  /** Divisor for the `N × avg` form: loop iteration count, else the number of counted runs. */
  runCount: number;
  /** True when at least one counted run has a valid `executionTimeMs`. */
  hasDuration: boolean;
}

/**
 * A referentially stable empty map returned when there are no step executions or no lookup.
 * Sharing this constant keeps Redux selectors from re-rendering on every poll tick.
 */
export const EMPTY_STEP_DURATIONS: ReadonlyMap<string, StepDuration> = Object.freeze(new Map());

/**
 * Aggregates step execution docs into per-step duration summaries.
 *
 * Only docs whose `stepType` matches the YAML lookup's `stepType` for that step are counted.
 * This is the same allow-list the execution flyout tree uses, so the numbers agree by construction
 * and engine wrapper docs (timeout zones, retry, on-failure) are excluded without a hand-maintained
 * deny-list.
 *
 * Returns a new Map on every call; callers should memoize.
 */
export const buildStepDurations = (
  stepExecutions: WorkflowStepExecutionDto[],
  steps: Record<string, StepInfo>
): Map<string, StepDuration> => {
  // Pass 1 — iteration counts for foreach/while steps.
  // Maps loopStepId → Set of unique full scope-path strings so nested loops count correctly.
  const iterationsByLoopStep = new Map<string, Set<string>>();

  for (const exec of stepExecutions) {
    const frames = exec.scopeStack ?? [];
    frames.forEach((frame, i) => {
      const hasNumericScope = frame.nestedScopes.some(
        (scope) => scope.scopeId !== undefined && /^\d+$/.test(scope.scopeId)
      );
      if (hasNumericScope) {
        // Use the full path up to (and including) this frame as the key so that nested loops
        // track their own per-iteration scope independently.
        const pathKey = frames
          .slice(0, i + 1)
          .flatMap((f) => [f.stepId, ...f.nestedScopes.map((s) => s.scopeId ?? '')])
          .join('>');

        let scopeSet = iterationsByLoopStep.get(frame.stepId);
        if (!scopeSet) {
          scopeSet = new Set();
          iterationsByLoopStep.set(frame.stepId, scopeSet);
        }
        scopeSet.add(pathKey);
      }
    });
  }

  // Pass 2 — accumulate totals, using the allow-list to drop wrapper docs.
  const acc = new Map<string, { totalMs: number; runs: number; hasDuration: boolean }>();

  for (const exec of stepExecutions) {
    const { stepId, stepType, executionTimeMs } = exec;
    const stepInfo = steps[stepId];

    // Allow-list: count only docs whose stepType matches the YAML step (drops wrapper nodes).
    if (stepInfo && stepType === stepInfo.stepType) {
      let entry = acc.get(stepId);
      if (!entry) {
        entry = { totalMs: 0, runs: 0, hasDuration: false };
        acc.set(stepId, entry);
      }

      entry.runs += 1;

      // Validity check mirrors extract_execution_metadata.ts:633-642.
      if (executionTimeMs !== undefined && executionTimeMs !== null && executionTimeMs >= 0) {
        entry.totalMs += executionTimeMs;
        entry.hasDuration = true;
      }
    }
  }

  // Build the final map, resolving runCount to iteration count for loop steps.
  const result = new Map<string, StepDuration>();
  for (const [stepId, entry] of acc) {
    const iterationSet = iterationsByLoopStep.get(stepId);
    const runCount = iterationSet ? iterationSet.size || 1 : entry.runs;
    result.set(stepId, {
      totalMs: entry.totalMs,
      runCount,
      hasDuration: entry.hasDuration,
    });
  }

  return result;
};

/** Formats a StepDuration for display in the gutter chip. */
export const formatStepDurationLabel = (duration: StepDuration): string => {
  const { totalMs, runCount, hasDuration } = duration;
  if (!hasDuration) return '';

  const durationStr = formatDuration(totalMs).trim();

  if (runCount > 1) {
    const avg = formatDuration(Math.round(totalMs / runCount)).trim();
    return i18n.translate('workflows.workflowYamlEditor.stepDurationGutter.repeatedLabel', {
      defaultMessage: '{count} × {duration}',
      description:
        'Step duration gutter chip label for a step that ran multiple times. {count} is the number of runs and {duration} is the average duration per run.',
      values: { count: runCount, duration: avg },
    });
  }

  return durationStr;
};

/** Hotspot tone for a duration chip: the step's share of the whole execution. */
export type StepDurationTone = 'none' | 'warning' | 'danger';

/**
 * Returns the tone for a duration chip based on the step's total time as a fraction of the
 * execution's duration.
 *
 * @param totalMs - The step's total wall-clock time (children included).
 * @param denominatorMs - The execution's total duration. Pass 0 while the run is in flight to
 *   suppress colour entirely.
 */
export const getStepDurationTone = (totalMs: number, denominatorMs: number): StepDurationTone => {
  if (denominatorMs <= 0) return 'none';
  const ratio = Math.min(1, totalMs / denominatorMs);
  if (ratio >= 0.7) return 'danger';
  if (ratio >= 0.4) return 'warning';
  return 'none';
};

// Per-character width estimate for the 11px tabular-nums chip font, plus 8px of horizontal
// padding (4px each side). The floor/ceiling prevent the lane from being either too narrow
// (clipping) or absurdly wide.
const CHARS_PX = 7.5;
const CHIP_H_PADDING_PX = 8;
const GUTTER_MIN_PX = 52;
const GUTTER_MAX_PX = 160;

/**
 * Estimates the lane width needed to fit the longest label without clipping.
 * Monaco adds its own 16px for the folding chevron on top of the value returned here.
 */
export const getDurationGutterWidth = (labels: Iterable<string>): number => {
  let maxLen = 0;
  for (const label of labels) {
    if (label.length > maxLen) maxLen = label.length;
  }
  // Err wide: the lane has `overflow: hidden`, so a clipped number violates "always show".
  const estimated = Math.ceil(maxLen * CHARS_PX) + CHIP_H_PADDING_PX;
  return Math.min(GUTTER_MAX_PX, Math.max(GUTTER_MIN_PX, estimated));
};
