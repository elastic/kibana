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
 * Precomputes severity for every step once, instead of the pill render loop calling
 * `getStepSeverity` (an O(errors) scan) once per step per render. Callers should memoize
 * this on `[stepEntries, validationErrors]` so it isn't rebuilt on every viewport-driven
 * re-render (see the viewport tracking effect in `workflow_step_minimap.tsx`).
 */
export const buildStepSeverityMap = (
  stepEntries: Array<[string, StepInfo]>,
  errors: YamlValidationResult[]
): Map<string, StepSeverity> => {
  const severityByStepId = new Map<string, StepSeverity>();
  for (const [stepId, step] of stepEntries) {
    severityByStepId.set(stepId, getStepSeverity(step, errors));
  }
  return severityByStepId;
};
