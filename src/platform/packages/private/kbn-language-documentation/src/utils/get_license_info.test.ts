/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionDefinition } from '../types';
import { getLicenseInfoForFunctions } from './get_license_info';

describe('getLicenseInfo', () => {
  test('should returns top-level license if present', () => {
    const fn: FunctionDefinition = {
      name: 'test_function',
      snapshot_only: false,
      type: 'function',
      titleName: 'Test Function',
      operator: '-',
      preview: false,
      signatures: [],
      license: 'platinum',
    };

    const result = getLicenseInfoForFunctions(fn);

    expect(result).toEqual({
      licenses: [
        {
          name: 'platinum',
          isSignatureSpecific: false,
          paramsWithLicense: [],
        },
      ],
      hasMultipleLicenses: false,
    });
  });

  test('should returns undefined if no license exists', () => {
    const fn: FunctionDefinition = {
      name: 'test_function_no_license',
      snapshot_only: false,
      type: 'string',
      titleName: 'Test Function No License',
      operator: '-',
      preview: false,
      signatures: [],
    };

    const result = getLicenseInfoForFunctions(fn);

    expect(result).toBeUndefined();
  });
});
