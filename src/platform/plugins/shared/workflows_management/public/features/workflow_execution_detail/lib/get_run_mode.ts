/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type WorkflowRunMode = 'production' | 'test' | 'stepTest';

export interface WorkflowRunModeInfo {
  runMode: WorkflowRunMode;
  stepTestTargetName?: string;
}

/**
 * Derive UI run-mode from execution metadata.
 * - production: normal runs (no badge)
 * - test: full-workflow test run (`isTestRun` without a targeted step)
 * - stepTest: single-step debug run (`isTestRun` + `stepId`)
 */
export const getRunMode = (execution: {
  isTestRun?: boolean;
  stepId?: string | null;
}): WorkflowRunModeInfo => {
  if (!execution.isTestRun) {
    return { runMode: 'production' };
  }
  if (execution.stepId) {
    return { runMode: 'stepTest', stepTestTargetName: execution.stepId };
  }
  return { runMode: 'test' };
};
