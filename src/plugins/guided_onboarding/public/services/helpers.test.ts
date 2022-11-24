/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { testGuideConfig } from '../../common/constants';
import { isLastStep } from './helpers';
import { testGuide, testGuideFirstStep, testGuideLastStep } from './api.mocks';

describe('GuidedOnboarding ApiService helpers', () => {
  describe('isLastStepActive', () => {
    it('returns true if the passed params are for the last step', () => {
      const result = isLastStep(testGuideConfig, testGuide, testGuideLastStep);
      expect(result).toBe(true);
    });

    it('returns false if the passed params are not for the last step', () => {
      const result = isLastStep(testGuideConfig, testGuide, testGuideFirstStep);
      expect(result).toBe(false);
    });
  });
});
