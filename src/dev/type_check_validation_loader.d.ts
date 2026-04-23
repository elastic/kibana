/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Hand-written declarations for the JS bridge in type_check_validation_loader.js.
 * These types must stay in sync with the source in
 * packages/kbn-ts-type-check-cli/execute_type_check_validation.ts.
 */

import type { ProcRunner } from '@kbn/dev-proc-runner';
import type { ValidationBaseContext } from '@kbn/dev-validation-runner';
import type { ToolingLog } from '@kbn/tooling-log';

type ProcRunnerLike = Pick<ProcRunner, 'run'>;

export interface TscValidationResult {
  projectCount: number;
}

export interface ExecuteTypeCheckValidationOptions {
  baseContext: ValidationBaseContext;
  log: ToolingLog;
  procRunner: ProcRunnerLike;
  cleanup?: boolean;
  extendedDiagnostics?: boolean;
  pretty?: boolean;
  verbose?: boolean;
  withArchive?: boolean;
}

export declare const executeTypeCheckValidation: (
  options: ExecuteTypeCheckValidationOptions
) => Promise<TscValidationResult | null>;

export declare const TSC_LABEL: 'tsc';
