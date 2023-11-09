/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getHeathBarLinearGradient, HEALTH_HEX_CODES } from './gradient';

describe('getHeathBarLinearGradient', () => {
  test('should return linear-gradient with percentages for each status', () => {
    expect(getHeathBarLinearGradient(5, 1, 1, 2)).toBe(
      `linear-gradient(to right, ${HEALTH_HEX_CODES.successful} 0% 56%, ${HEALTH_HEX_CODES.partial} 56% 67%, ${HEALTH_HEX_CODES.skipped} 67% 78%, ${HEALTH_HEX_CODES.failed} 78% 100%)`
    );
  });

  test('should return linear-gradient with percentages for each status with count above zero', () => {
    expect(getHeathBarLinearGradient(5, 0, 0, 2)).toBe(
      `linear-gradient(to right, ${HEALTH_HEX_CODES.successful} 0% 71%, ${HEALTH_HEX_CODES.failed} 71% 100%)`
    );
  });
});
