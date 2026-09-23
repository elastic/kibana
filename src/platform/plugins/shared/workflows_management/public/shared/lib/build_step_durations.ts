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
  /** `executionTimeMs` summed over every counted (completed) run. Drives the chip colour. */
  totalMs: number;
  /**
   * 1 for `foreach`/`while` steps (they always show total, not N × avg).
   * Otherwise: number of completed runs (docs with a valid executionTimeMs).
   */
  runCount: number;
  /** True when at least one counted run has a valid `executionTimeMs`. */
  hasDuration: boolean;
  /** Lowest valid `executionTimeMs` across counted runs; 0 when `hasDuration` is false. */
  minMs: number;
  /** Highest valid `executionTimeMs` across counted runs; 0 when `hasDuration` is false. */
  maxMs: number;
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
 * `runCount` reflects only completed runs (docs with a valid `executionTimeMs`). In-flight docs
 * (null/undefined `executionTimeMs`) do not affect the average, so a live run that has not yet
 * finished never dilutes the chip.
 *
 * Returns a new Map on every call; callers should memoize.
 */
export const buildStepDurations = (
  stepExecutions: WorkflowStepExecutionDto[],
  steps: Record<string, StepInfo>
): Map<string, StepDuration> => {
  // Accumulate totals, using the allow-list to drop wrapper docs.
  const acc = new Map<
    string,
    { totalMs: number; runs: number; minMs: number; maxMs: number }
  >();

  for (const exec of stepExecutions) {
    const { stepId, stepType, executionTimeMs } = exec;
    const stepInfo = steps[stepId];

    // Allow-list: count only docs whose stepType matches the YAML step (drops wrapper nodes).
    if (stepInfo && stepType === stepInfo.stepType) {
      // Validity check mirrors step_execution_tree_item_label.tsx:133-135.
      // Number.isFinite guards against any non-finite payload that would corrupt totals.
      if (
        executionTimeMs !== undefined &&
        executionTimeMs !== null &&
        Number.isFinite(executionTimeMs) &&
        executionTimeMs >= 0
      ) {
        let entry = acc.get(stepId);
        if (!entry) {
          entry = { totalMs: 0, runs: 0, minMs: Infinity, maxMs: 0 };
          acc.set(stepId, entry);
        }

        entry.runs += 1;
        entry.totalMs += executionTimeMs;
        entry.minMs = Math.min(entry.minMs, executionTimeMs);
        entry.maxMs = Math.max(entry.maxMs, executionTimeMs);
      }
    }
  }

  // Build the final map.
  // foreach/while steps always show their total wall clock (runCount=1) rather than N × avg,
  // because each doc already spans the full loop duration — N × avg would misrepresent them.
  const result = new Map<string, StepDuration>();
  for (const [stepId, entry] of acc) {
    const stepInfo = steps[stepId];
    const isLoopStep = stepInfo?.stepType === 'foreach' || stepInfo?.stepType === 'while';
    result.set(stepId, {
      totalMs: entry.totalMs,
      runCount: isLoopStep ? 1 : entry.runs,
      hasDuration: entry.runs > 0,
      minMs: entry.runs > 0 ? entry.minMs : 0,
      maxMs: entry.runs > 0 ? entry.maxMs : 0,
    });
  }

  return result;
};

/** Formats a StepDuration for display in the gutter chip. */
export const formatStepDurationLabel = (duration: StepDuration): string => {
  const { totalMs, runCount, hasDuration } = duration;
  if (!hasDuration) return '';

  if (runCount > 1) {
    const avg = formatDuration(Math.round(totalMs / runCount)).trim();
    return i18n.translate('workflows.workflowYamlEditor.stepDurationGutter.repeatedLabel', {
      defaultMessage: '~{duration}',
      description:
        'Step duration gutter chip label for a step that ran multiple times. {duration} is the average duration per run, prefixed with ~ to indicate it is an approximation.',
      values: { duration: avg },
    });
  }

  return formatDuration(totalMs).trim();
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

// Per-character width estimate for the 11px tabular-nums chip font, plus 6px of horizontal
// padding (3px each side). The floor/ceiling prevent the lane from being either too narrow
// (clipping) or absurdly wide.
// Note: Monaco adds its own 16px for the folding chevron on top of the value returned here.
const CHARS_PX = 6.6;
const CHIP_H_PADDING_PX = 6;
const GUTTER_MIN_PX = 34;
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
