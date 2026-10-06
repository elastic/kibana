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
export declare const DEPRECATED_STEP_METADATA: Record<string, StepDeprecationInfo>;
/**
 * Prefix-based deprecation for step types. Any step type starting with one of these
 * prefixes is treated as deprecated. This avoids enumerating every sub-action when an
 * entire connector family is superseded by a purpose-built step.
 */
export declare const DEPRECATED_STEP_PREFIX_METADATA: StepPrefixDeprecationInfo[];
export declare function getStepPrefixDeprecationInfo(
  stepType: string
): StepDeprecationInfo | undefined;
export declare function getStepDeprecationInfo(stepType: string): StepDeprecationInfo | undefined;
export declare function isDeprecatedStepType(stepType: string): boolean;
export declare function getDeprecatedStepMessage(
  stepType: string,
  deprecation: StepDeprecationInfo
): string;
