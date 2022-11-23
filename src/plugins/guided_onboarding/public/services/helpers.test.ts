/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isIntegrationInGuideStep, isLastStep } from './helpers';
import {
  testGuide,
  testGuideFirstStep,
  testGuideLastStep,
  testGuideNotActiveState,
  testGuideStep1InProgressState,
  testGuideStep2InProgressState,
  testIntegration,
  wrongIntegration,
} from './api.mocks';

describe('GuidedOnboarding ApiService helpers', () => {
  describe('isLastStepActive', () => {
    it('returns true if the passed params are for the last step', () => {
      const result = isLastStep(testGuide, testGuideLastStep);
      expect(result).toBe(true);
    });

    it('returns false if the passed params are not for the last step', () => {
      const result = isLastStep(testGuide, testGuideFirstStep);
      expect(result).toBe(false);
    });
  });

  describe('isIntegrationInGuideStep', () => {
    it('return true if the integration is defined in the guide step config', () => {
      const result = isIntegrationInGuideStep(testGuideStep1InProgressState, testIntegration);
      expect(result).toBe(true);
    });
    it('returns false if a different integration is defined in the guide step', () => {
      const result = isIntegrationInGuideStep(testGuideStep1InProgressState, wrongIntegration);
      expect(result).toBe(false);
    });
    it('returns false if no integration is defined in the guide step', () => {
      const result = isIntegrationInGuideStep(testGuideStep2InProgressState, testIntegration);
      expect(result).toBe(false);
    });
    it('returns false if no guide is active', () => {
      const result = isIntegrationInGuideStep(testGuideNotActiveState, testIntegration);
      expect(result).toBe(false);
    });
    it('returns false if no integration passed', () => {
      const result = isIntegrationInGuideStep(testGuideStep1InProgressState);
      expect(result).toBe(false);
    });
  });
});
