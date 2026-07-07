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

export interface StepPrefixDeprecationInfo {
  /** Prefix to match against step type (e.g., 'inference.' matches 'inference.completion') */
  prefix: string;
  deprecation: StepDeprecationInfo;
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

/**
 * Prefix-based deprecation for step types. Any step type starting with one of these
 * prefixes is treated as deprecated. This avoids enumerating every sub-action when an
 * entire connector family is superseded by a purpose-built step.
 */
export const DEPRECATED_STEP_PREFIX_METADATA: StepPrefixDeprecationInfo[] = [
  { prefix: 'inference.', deprecation: { replacementStepType: 'ai.prompt' } },
  { prefix: 'bedrock.', deprecation: { replacementStepType: 'ai.prompt' } },
  { prefix: 'gen-ai.', deprecation: { replacementStepType: 'ai.prompt' } },
  { prefix: 'gemini.', deprecation: { replacementStepType: 'ai.prompt' } },
];

export function getStepPrefixDeprecationInfo(stepType: string): StepDeprecationInfo | undefined {
  for (const { prefix, deprecation } of DEPRECATED_STEP_PREFIX_METADATA) {
    if (stepType.startsWith(prefix)) {
      return deprecation;
    }
  }
  return undefined;
}

export function getStepDeprecationInfo(stepType: string): StepDeprecationInfo | undefined {
  const exact = DEPRECATED_STEP_METADATA[stepType];
  if (exact) {
    return exact;
  }
  return getStepPrefixDeprecationInfo(stepType);
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
