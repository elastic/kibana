/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Configuration for a quick check from quick_checks.json
 */
export interface QuickCheck {
  script: string;
  nodeCommand?: string;
  mayChangeFiles?: boolean;
  skipLocal?: boolean;
  /** Skip this check in local runs when no target packages are identified */
  skipLocalIfNoPackages?: boolean;
  /** Argument name for passing target files as comma-separated list (e.g., "--files") */
  filesArg?: string;
  /** Argument name for passing target packages as multiple arguments (e.g., "--path" becomes "--path ./pkg1 --path ./pkg2") */
  pathArg?: string;
  /** Argument name for passing target packages as comma-separated list (e.g., "--packages") */
  packagesArg?: string;
  /** If true, append target packages as positional arguments (e.g., "cmd pkg1 pkg2") */
  positionalPackages?: boolean;
}

/**
 * A check ready to be executed
 */
export interface CheckToRun {
  script: string;
  nodeCommand?: string;
  filesArg?: string;
  pathArg?: string;
  packagesArg?: string;
  positionalPackages?: boolean;
  mayChangeFiles?: boolean;
}

/**
 * Result of running a check
 */
export interface CheckResult {
  success: boolean;
  script: string;
  nodeCommand?: string;
  output: string;
  durationMs: number;
}

/**
 * Context passed through the quick checks execution
 */
export interface QuickChecksContext {
  log: ToolingLog;
  showCommands: boolean;
  targetFiles?: string;
  targetPackages?: string;
  fixMode: boolean;
  isCI: boolean;
}
