/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '../spec/schema';
interface StepNameValidationError {
  stepName: string;
  occurrences: number;
  message: string;
}
export interface StepNameValidationResult {
  isValid: boolean;
  errors: StepNameValidationError[];
}
/**
 * Validates that all step names in a workflow are unique.
 * Uses `walkStepTree` to cover every slot: `steps`, `else`, `branches[]`,
 * `cases[]`, `default`, `on-failure.fallback`, `iteration-on-failure.fallback`.
 */
export declare function validateStepNameUniqueness(
  workflow: WorkflowYaml
): StepNameValidationResult;
export {};
