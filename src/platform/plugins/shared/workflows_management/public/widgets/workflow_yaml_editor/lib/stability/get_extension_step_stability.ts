/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepStabilityLevel } from '@kbn/workflows';

export interface StepStabilitySource {
  readonly stability?: StepStabilityLevel;
}

/**
 * Stability level for extension-registered steps (hover badge + suggest parity for tech preview).
 */
export function getExtensionStepStability(
  definition: StepStabilitySource
): StepStabilityLevel | undefined {
  if (definition.stability === 'beta' || definition.stability === 'tech_preview') {
    return definition.stability;
  }
  if (definition.stability === 'stable') {
    return undefined;
  }
  // Unmarked extension steps are experimental until explicitly marked stable.
  return 'tech_preview';
}
