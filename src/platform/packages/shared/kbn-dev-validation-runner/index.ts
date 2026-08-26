/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  describeValidationScope,
  describeValidationNoTargetsScope,
  describeValidationScoping,
  resolveValidationBaseContext,
} from './src/run_validation_command';
export type { ValidationBaseContext } from './src/run_validation_command';
export {
  resolveValidationAffectedProjects,
  type ValidationAffectedProjectsContext,
} from './src/resolve_validation_run_context';
export {
  buildValidationCliArgs,
  formatReproductionCommand,
  hasValidationRunFlags,
  readValidationRunFlags,
  VALIDATION_RUN_HELP,
  VALIDATION_RUN_STRING_FLAGS,
} from './src/validation_run_cli';
