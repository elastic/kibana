/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getHeathBarLinearGradient } from './gradient';

describe('getHeathBarLinearGradient', () => {
  test('should return linear-gradient with percentages for each status', () => {
    expect(getHeathBarLinearGradient(5, 1, 1, 2)).toBe(
      'linear-gradient(to right, #54B399 0% 56%, #D6BF57 56% 67%, #DA8B45 67% 78%, #E7664C 78% 100%)'
    );
  });

  test('should return linear-gradient with percentages for each status with count above zero', () => {
    expect(getHeathBarLinearGradient(5, 0, 0, 2)).toBe(
      'linear-gradient(to right, #54B399 0% 71%, #E7664C 71% 100%)'
    );
  });
});
