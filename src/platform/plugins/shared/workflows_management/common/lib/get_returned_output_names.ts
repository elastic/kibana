/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { alwaysEndsInOutputStep, getOutputSteps } from '@kbn/workflows/graph';
import { isRecord } from '@kbn/workflows-yaml';
import { isCompletingOutputStep } from './workflow_dependents/find_call_sites';

/**
 * Returns the output names a workflow's completing `workflow.output` steps set, including those in
 * fallbacks, but not those no run can reach. Undefined when a run can complete without one (callers then get its last step's
 * output), or when one of them sets a computed value.
 */
export const getReturnedOutputNames = (definition: unknown): string[] | undefined => {
  if (!alwaysEndsInOutputStep(definition)) {
    return undefined;
  }
  const blocks = (getOutputSteps(definition) ?? [])
    .filter(isCompletingOutputStep)
    .map(({ with: values }) => values);
  if (blocks.length === 0 || !blocks.every(isRecord)) {
    return undefined;
  }
  return [...new Set(blocks.flatMap((values) => Object.keys(values)))];
};
