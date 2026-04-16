/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const booleanFromEnv = (varName: string, defaultValue: boolean = false): boolean => {
  const envValue = process.env[varName];

  if (envValue === undefined || envValue.trim().length === 0) {
    return defaultValue;
  }

  return ['1', 'yes', 'true'].includes(envValue.trim().toLowerCase());
};

export const SCOUT_VISUAL_REGRESSION_ENABLED_ENV = 'SCOUT_VISUAL_REGRESSION_ENABLED';
export const SCOUT_VISUAL_REGRESSION_UPDATE_BASELINES_ENV =
  'SCOUT_VISUAL_REGRESSION_UPDATE_BASELINES';
export const SCOUT_VISUAL_REGRESSION_ATTACHMENT_NAME = 'scout-vrt-checkpoints';

export const isVisualRegressionEnabled = (): boolean =>
  booleanFromEnv(SCOUT_VISUAL_REGRESSION_ENABLED_ENV);

export const isUpdateBaselinesEnabled = (): boolean =>
  booleanFromEnv(SCOUT_VISUAL_REGRESSION_UPDATE_BASELINES_ENV);

export const ensureVisualRegressionRunId = (factory: () => string): string => {
  const existingRunId = process.env.TEST_RUN_ID;

  if (existingRunId) {
    return existingRunId;
  }

  const runId = factory();
  process.env.TEST_RUN_ID = runId;
  return runId;
};

export const getVisualRegressionRunId = (): string => {
  const runId = process.env.TEST_RUN_ID;

  if (!runId) {
    throw new Error('TEST_RUN_ID must be set before running visualTest');
  }

  return runId;
};
