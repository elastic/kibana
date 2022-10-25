/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { guidesConfig } from '../constants/guides_config';
import { isIntegrationInGuideStep, isLastStep } from './helpers';
import {
  noGuideActiveState,
  securityAddDataInProgressState,
  securityRulesActiveState,
} from './api.mocks';

const searchGuide = 'search';
const firstStep = guidesConfig[searchGuide].steps[0].id;
const lastStep = guidesConfig[searchGuide].steps[guidesConfig[searchGuide].steps.length - 1].id;

describe('GuidedOnboarding ApiService helpers', () => {
  // this test suite depends on the guides config
  describe('isLastStepActive', () => {
    it('returns true if the passed params are for the last step', () => {
      const result = isLastStep(searchGuide, lastStep);
      expect(result).toBe(true);
    });

    it('returns false if the passed params are not for the last step', () => {
      const result = isLastStep(searchGuide, firstStep);
      expect(result).toBe(false);
    });
  });

  describe('isIntegrationInGuideStep', () => {
    it('return true if the integration is defined in the guide step config', () => {
      const result = isIntegrationInGuideStep(securityAddDataInProgressState, 'endpoint');
      expect(result).toBe(true);
    });
    it('returns false if a different integration is defined in the guide step', () => {
      const result = isIntegrationInGuideStep(securityAddDataInProgressState, 'kubernetes');
      expect(result).toBe(false);
    });
    it('returns false if no integration is defined in the guide step', () => {
      const result = isIntegrationInGuideStep(securityRulesActiveState, 'endpoint');
      expect(result).toBe(false);
    });
    it('returns false if no guide is active', () => {
      const result = isIntegrationInGuideStep(noGuideActiveState, 'endpoint');
      expect(result).toBe(false);
    });
    it('returns false if no integration passed', () => {
      const result = isIntegrationInGuideStep(securityAddDataInProgressState);
      expect(result).toBe(false);
    });
  });
});
