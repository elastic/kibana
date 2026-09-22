/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepInfo } from '@kbn/workflows-yaml';
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';

export type StepSeverity = 'error' | 'warning' | null;

/** Severity and own-vs-inherited origin of a step's worst validation marker. */
export interface StepSeverityInfo {
  /** Highest-severity marker in this step's range (own or inherited from descendants). */
  severity: StepSeverity;
  /**
   * True when at least one marker falls in the step's *own* line range
   * (`lineStart` to `effectiveLineEnd`, where `effectiveLineEnd` is trimmed to
   * just before the first direct child). False means all markers are inherited
   * from descendants whose lines fall beyond `effectiveLineEnd`.
   *
   * Used only to drive screen-reader text — the visual dot is identical in both cases.
   */
  isOwn: boolean;
}

export const getStepSeverity = (step: StepInfo, errors: YamlValidationResult[]): StepSeverity => {
  let hasWarning = false;
  for (const err of errors) {
    const isInStepRange =
      err.severity !== null &&
      err.startLineNumber >= step.lineStart &&
      err.startLineNumber <= step.lineEnd;
    if (isInStepRange) {
      if (err.severity === 'error') return 'error';
      if (err.severity === 'warning') hasWarning = true;
    }
  }
  return hasWarning ? 'warning' : null;
};

/**
 * Precomputes severity (and own-vs-inherited origin) for every step once, instead of
 * the pill render loop calling `getStepSeverity` (an O(errors) scan) once per step
 * per render. Callers should memoize this on `[stepEntries, validationErrors,
 * effectiveLineEnd]` so it isn't rebuilt on every viewport-driven re-render.
 *
 * **Roll-up is intentional.** A parent step's `lineEnd` spans its entire subtree, so
 * errors on any descendant also appear as severity on every ancestor. This differs
 * deliberately from `buildEffectiveLineEnd` in `viewport_steps`, which *trims*
 * `lineEnd` to exclude nested rows. The minimap severity communicates "something is
 * wrong in or under this step", which is more useful than silently hiding ancestor dots
 * when a child has an error. The roll-up behaviour is pinned by the `buildStepSeverityMap`
 * tests; do not "fix" this without understanding the intent.
 *
 * **Performance.** Errors are first bucketed by start line — O(errors) — so the
 * per-step range scan touches only unique-error lines rather than the full error list.
 * Total: O(errors + steps × unique_error_lines_in_range), which is significantly
 * cheaper than the naive O(steps × errors) when the error list is large.
 */
const buildWorstByLine = (errors: YamlValidationResult[]): Map<number, StepSeverity> => {
  const worstByLine = new Map<number, StepSeverity>();
  for (const err of errors) {
    if (err.severity === 'error' || err.severity === 'warning') {
      const line = err.startLineNumber;
      const prev = worstByLine.get(line);
      if (prev !== 'error') {
        // 'error' beats 'warning'; set on first visit or upgrade warning → error.
        worstByLine.set(line, err.severity === 'error' ? 'error' : prev ?? err.severity);
      }
    }
  }
  return worstByLine;
};

export const buildStepSeverityMap = (
  stepEntries: Array<[string, StepInfo]>,
  errors: YamlValidationResult[],
  effectiveLineEnd: Map<string, number>
): Map<string, StepSeverityInfo> => {
  // Bucket errors by start line, keeping the highest severity per line — O(errors).
  const worstByLine = buildWorstByLine(errors);

  const result = new Map<string, StepSeverityInfo>();
  for (const [stepId, step] of stepEntries) {
    // ownEnd: trimmed line range (own errors only); step.lineEnd: full subtree (roll-up).
    const ownEnd = effectiveLineEnd.get(stepId) ?? step.lineEnd;
    let ownWorst: StepSeverity = null;
    let inheritedWorst: StepSeverity = null;

    for (const [line, sev] of worstByLine) {
      if (line >= step.lineStart && line <= step.lineEnd) {
        if (line <= ownEnd) {
          if (!ownWorst || (sev === 'error' && ownWorst === 'warning')) ownWorst = sev;
        } else {
          if (!inheritedWorst || (sev === 'error' && inheritedWorst === 'warning'))
            inheritedWorst = sev;
        }
      }
    }

    const severity: StepSeverity =
      ownWorst === 'error' || inheritedWorst === 'error'
        ? 'error'
        : ownWorst === 'warning' || inheritedWorst === 'warning'
        ? 'warning'
        : null;

    result.set(stepId, { severity, isOwn: ownWorst !== null });
  }

  return result;
};
