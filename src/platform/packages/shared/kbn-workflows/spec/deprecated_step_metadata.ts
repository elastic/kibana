/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface StepDeprecationInfo {
  replacementStepType?: string;
  message?: string;
}

export const DEPRECATED_STEP_METADATA: Record<string, StepDeprecationInfo> = {
  'kibana.createCase': {
    replacementStepType: 'cases.createCase',
  },
  'kibana.getCase': {
    replacementStepType: 'cases.getCase',
  },
  'kibana.updateCase': {
    replacementStepType: 'cases.updateCase',
  },
  'kibana.addCaseComment': {
    replacementStepType: 'cases.addComment',
  },
  'kibana.createCaseDefaultSpace': {
    replacementStepType: 'cases.createCase',
  },
  'kibana.getCaseDefaultSpace': {
    replacementStepType: 'cases.getCase',
  },
  'kibana.updateCaseDefaultSpace': {
    replacementStepType: 'cases.updateCase',
  },
  'kibana.addCaseCommentDefaultSpace': {
    replacementStepType: 'cases.addComment',
  },
};

export function getStepDeprecationInfo(stepType: string): StepDeprecationInfo | undefined {
  return DEPRECATED_STEP_METADATA[stepType];
}

export function isDeprecatedStepType(stepType: string): boolean {
  return getStepDeprecationInfo(stepType) !== undefined;
}

export function getDeprecatedStepMessage(
  stepType: string,
  deprecation: StepDeprecationInfo
): string {
  if (deprecation.message) {
    return deprecation.message;
  }
  if (deprecation.replacementStepType) {
    return `Step type "${stepType}" is deprecated. Use "${deprecation.replacementStepType}" instead.`;
  }
  return `Step type "${stepType}" is deprecated.`;
}
