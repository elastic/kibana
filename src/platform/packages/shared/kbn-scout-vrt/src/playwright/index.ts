/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { createPlaywrightConfig } from './config';
export { visualTest } from './test';
export type { VisualTestStepOptions } from './test';
export type { VisualCheckpointRecord, VisualSourceLocation } from './runtime/types';
export type {
  VisualRegressionManifest,
  VisualRegressionManifestResult,
  VisualRegressionManifestSummary,
  VisualRegressionRunManifest,
  VisualRegressionRunManifestPackage,
  VisualRegressionRunMode,
  VisualRegressionRunStatus,
  VisualRegressionTarget,
} from './reporting/manifest';
export { VISUAL_REGRESSION_SCHEMA_VERSION } from './reporting/manifest';
