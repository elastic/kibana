/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MultipleLicenseInfo } from '../types';
import { getLicensesArray } from './get_license_array';

describe('getLicensesArray', () => {
  test('should returns licenses array when valid MultipleLicenseInfo is provided', () => {
    const licenseData: MultipleLicenseInfo = {
      hasMultipleLicenses: true,
      licenses: [
        { name: 'gold' },
        { name: 'enterprise', isSignatureSpecific: true, paramsWithLicense: ['param1'] },
      ],
    };

    const result = getLicensesArray(licenseData);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('gold');
    expect(result[1].name).toBe('enterprise');
    expect(result[1].isSignatureSpecific).toBe(true);
    expect(result[1].paramsWithLicense).toEqual(['param1']);
  });

  test('should returns empty array when input is undefined', () => {
    const result = getLicensesArray(undefined);
    expect(result).toEqual([]);
  });

  test('should returns empty array when licenses is not an array', () => {
    const result = getLicensesArray({ licenses: undefined, hasMultipleLicenses: false } as any);
    expect(result).toEqual([]);
  });

  test('should returns empty array when licenses array is empty', () => {
    const licenseData: MultipleLicenseInfo = {
      hasMultipleLicenses: false,
      licenses: [],
    };

    const result = getLicensesArray(licenseData);
    expect(result).toEqual([]);
  });
});
