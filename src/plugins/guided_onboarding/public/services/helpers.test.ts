/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { guidesConfig } from '../constants/guides_config';
import { isLastStep } from './helpers';
import { GuidedOnboardingState } from '../types';
import { getNextStep, isIntegrationInGuideStep, isLastStep } from './helpers';

const searchGuide = 'search';
const firstStep = guidesConfig[searchGuide].steps[0].id;
const lastStep = guidesConfig[searchGuide].steps[2].id;
const secondStep = guidesConfig[searchGuide].steps[1].id;
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

  describe('getNextStep', () => {
    it('returns id of the next step', () => {
      const result = getNextStep(searchGuide, firstStep);
      expect(result).toEqual(secondStep);
    });

    it('returns undefined if the params are not part of the config', () => {
      const result = getNextStep('some_guide', 'some_step');
      expect(result).toBeUndefined();
    });

    it(`returns undefined if it's the last step`, () => {
      const result = getNextStep(searchGuide, lastStep);
      expect(result).toBeUndefined();
    });
  });

  describe('isIntegrationInGuideStep', () => {
    const securityAddDataState: GuidedOnboardingState = {
      activeGuide: 'security',
      activeStep: 'add_data',
    };
    it('return true if the integration is defined in the guide step config', () => {
      const result = isIntegrationInGuideStep(securityAddDataState, 'endpoint');
      expect(result).toBe(true);
    });
    it('returns false if a different integration is defined in the guide step', () => {
      const result = isIntegrationInGuideStep(securityAddDataState, 'kubernetes');
      expect(result).toBe(false);
    });
    it('returns false if no integration is defined in the guide step', () => {
      const securityRulesState: GuidedOnboardingState = {
        activeGuide: 'security',
        activeStep: 'rules',
      };
      const result = isIntegrationInGuideStep(securityRulesState, 'endpoint');
      expect(result).toBe(false);
    });
    it('returns false if no guide is active', () => {
      const noGuideState: GuidedOnboardingState = {
        activeGuide: 'unset',
        activeStep: 'unset',
      };
      const result = isIntegrationInGuideStep(noGuideState, 'endpoint');
      expect(result).toBe(false);
    });
    it('returns false if no integration passed', () => {
      const result = isIntegrationInGuideStep(securityAddDataState);
      expect(result).toBe(false);
    });
  });
});
