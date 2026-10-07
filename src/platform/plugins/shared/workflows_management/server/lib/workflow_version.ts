/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowProperties } from '../storage/workflow_storage';

export const INITIAL_WORKFLOW_VERSION = 1;

/** Monotonic definition version for the next successful primary write. */
export const getNextWorkflowVersion = (existing?: Pick<WorkflowProperties, 'version'>): number =>
  (existing?.version ?? 0) + 1;

/** Same trim normalization as managed `definitionHash`. */
const hasWorkflowYamlChanged = (
  previousYaml: string | undefined | null,
  nextYaml: string | undefined | null
): boolean => (previousYaml ?? '').trim() !== (nextYaml ?? '').trim();

/**
 * Assign definition version from fresh primary-index state.
 * Create (`existing` undefined) → 1. Update → bump only when YAML changed;
 * otherwise preserve.
 */
export const applyWorkflowVersion = (
  document: WorkflowProperties,
  existing?: WorkflowProperties
): WorkflowProperties => {
  if (existing && !hasWorkflowYamlChanged(existing.yaml, document.yaml)) {
    return {
      ...document,
      version: existing.version ?? INITIAL_WORKFLOW_VERSION,
    };
  }

  return {
    ...document,
    version: getNextWorkflowVersion(existing),
  };
};
