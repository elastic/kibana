/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { guidesConfig } from '../constants/guides_config';
import { isLastStep } from './helpers';

const searchGuide = 'search';
const firstStep = guidesConfig[searchGuide].steps[0].id;
const lastStep = guidesConfig[searchGuide].steps[2].id;

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
});
