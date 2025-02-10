/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useHeathBarLinearGradient, useHealthHexCodes } from './gradient';

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({
    euiTheme: {
      colors: {
        backgroundFilledSuccess: 'green',
        backgroundLightWarning: 'yellow',
        backgroundFilledDanger: 'red',
      },
    },
  }),
}));

describe('useHeathBarLinearGradient', () => {
  const healthHexCodes = useHealthHexCodes();

  test('should return linear-gradient with percentages for each status', () => {
    expect(useHeathBarLinearGradient(5, 1, 1, 2)).toBe(
      `linear-gradient(to right, ${healthHexCodes.successful} 0% 56%, ${healthHexCodes.partial} 56% 67%, ${healthHexCodes.skipped} 67% 78%, ${healthHexCodes.failed} 78% 100%)`
    );
  });

  test('should return linear-gradient with percentages for each status with count above zero', () => {
    expect(useHeathBarLinearGradient(5, 0, 0, 2)).toBe(
      `linear-gradient(to right, ${healthHexCodes.successful} 0% 71%, ${healthHexCodes.failed} 71% 100%)`
    );
  });
});
