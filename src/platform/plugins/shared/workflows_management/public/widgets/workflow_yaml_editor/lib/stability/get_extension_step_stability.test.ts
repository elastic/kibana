/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepStabilitySource } from './get_extension_step_stability';
import { getExtensionStepStability } from './get_extension_step_stability';

describe('getExtensionStepStability', () => {
  it('returns explicit beta stability', () => {
    const definition: StepStabilitySource = { stability: 'beta' };
    expect(getExtensionStepStability(definition)).toBe('beta');
  });

  it('returns undefined for stable extension steps', () => {
    const definition: StepStabilitySource = { stability: 'stable' };
    expect(getExtensionStepStability(definition)).toBeUndefined();
  });

  it('defaults unmarked extension steps to tech_preview', () => {
    const definition: StepStabilitySource = {};
    expect(getExtensionStepStability(definition)).toBe('tech_preview');
  });
});
