/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { collectAllStepNames } from './collect_all_step_names';
import type { StepNameInfo, YamlValidationResult } from '../model/types';

export function validateStepNameUniqueness(yamlDocument: any): YamlValidationResult[] {
  const errors: YamlValidationResult[] = [];

  // Validate step name uniqueness
  const stepNames = collectAllStepNames(yamlDocument);
  const stepNameCounts = new Map<string, StepNameInfo[]>();

  // Group step names by their values
  for (const stepInfo of stepNames) {
    const existing = stepNameCounts.get(stepInfo.name);
    if (existing) {
      existing.push(stepInfo);
    } else {
      stepNameCounts.set(stepInfo.name, [stepInfo]);
    }
  }

  // Add markers for duplicate step names
  for (const [stepName, occurrences] of stepNameCounts) {
    if (occurrences.length > 1) {
      for (const occurrence of occurrences) {
        errors.push({
          id: `${stepName}-${occurrence.startLineNumber}-${occurrence.startColumn}-${occurrence.endLineNumber}-${occurrence.endColumn}`,
          owner: 'step-name-validation',
          message: `Step name "${stepName}" is not unique. Found ${occurrences.length} steps with this name.`,
          startLineNumber: occurrence.startLineNumber,
          startColumn: occurrence.startColumn,
          endLineNumber: occurrence.endLineNumber,
          endColumn: occurrence.endColumn,
          severity: 'error',
          hoverMessage: null,
        });
      }
    }
  }

  return errors;
}
