/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepInfo } from '@kbn/workflows-yaml';

/**
 * Fingerprints only the fields the minimap actually reads from a step, so it stays
 * stable across Redux recomputes that produce a brand new `workflowLookup` object
 * (e.g. on every keystroke) but leave the step list's shape unchanged.
 *
 * Mirrors the fingerprint pattern used for YAML validation results
 * (`validationResultFingerprint` in
 * `../../../features/validate_workflow_yaml/model/types.ts`): a cheap, order-sensitive
 * string built from the fields that matter, used to gate expensive derived state behind
 * a reference-stability check rather than recomputing on every render.
 */
export const computeStepStructureFingerprint = (stepEntries: Array<[string, StepInfo]>): string =>
  stepEntries
    .map(
      ([stepId, step]) =>
        `${stepId}\0${step.lineStart}:${step.lineEnd}\0${step.parentStepId ?? ''}\0${
          step.branchKey ?? ''
        }`
    )
    .join('\n');
