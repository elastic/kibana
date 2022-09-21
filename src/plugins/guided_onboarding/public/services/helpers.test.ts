/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getNextStep, isLastStep } from './helpers';

describe('GuidedOnboarding ApiService helpers', () => {
  // this test suite depends on the guides config
  describe('isLastStepActive', () => {
    it('returns true if the passed params are for the last step', () => {
      const result = isLastStep('search', 'review');
      expect(result).toBe(true);
    });

    it('returns false if the passed params are not for the last step', () => {
      const result = isLastStep('search', 'add_data');
      expect(result).toBe(false);
    });
  });

  describe('getNextStep', () => {
    it('returns id of the next step', () => {
      const result = getNextStep('search', 'add_data');
      expect(result).toEqual('search_experience');
    });

    it('returns undefined if the params are not part of the config', () => {
      const result = getNextStep('some_guide', 'some_step');
      expect(result).toBeUndefined();
    });

    it(`returns undefined if it's the last step`, () => {
      const result = getNextStep('search', 'review');
      expect(result).toBeUndefined();
    });
  });
});
