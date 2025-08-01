/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FunctionDefinition } from '../types';
import { getLicenseInfo } from './get_license_info';

describe('getLicenseInfo', () => {
  test('should returns top-level license if present', () => {
    const fn: FunctionDefinition = {
      license: 'PLATINUM',
      signatures: [],
    };

    const result = getLicenseInfo(fn);

    expect(result).toEqual({
      licenses: [
        {
          name: 'PLATINUM',
          isSignatureSpecific: false,
          paramsWithLicense: [],
        },
      ],
      hasMultipleLicenses: false,
    });
  });

  test('should returns undefined if no license exists', () => {
    const fn: FunctionDefinition = {
      signatures: [
        {
          params: [{ name: 'x', type: 'string' }],
        },
      ],
    };

    const result = getLicenseInfo(fn);

    expect(result).toBeUndefined();
  });
});
