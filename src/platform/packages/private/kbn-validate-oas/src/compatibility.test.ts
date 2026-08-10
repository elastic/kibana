/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeRedoclyPointer, parseRedoclyCompatibilityIssues } from './compatibility';

describe('normalizeRedoclyPointer', () => {
  it('normalizes Redocly JSON pointers to the path format used by validate_oas_docs', () => {
    expect(normalizeRedoclyPointer('#/paths/~1api~1test/get')).toBe('/paths/~1api~1test/get');
    expect(normalizeRedoclyPointer('#')).toBe('');
    expect(normalizeRedoclyPointer()).toBe('');
  });
});

describe('parseRedoclyCompatibilityIssues', () => {
  it('keeps only error-level Redocly problems and normalizes the pointer path', () => {
    const output = JSON.stringify({
      problems: [
        {
          severity: 'error',
          ruleId: 'compatibility-rules-plugin/path-parameters-required',
          message: 'Path parameter "id" must set `required: true`.',
          location: [
            {
              pointer: '#/paths/~1api~1test~1{id}/get/parameters/0/required',
            },
          ],
        },
        {
          severity: 'warn',
          ruleId: 'operation-summary',
          message: 'summary warning',
          location: [
            {
              pointer: '#/paths/~1api~1test/get/summary',
            },
          ],
        },
      ],
    });

    expect(parseRedoclyCompatibilityIssues(output)).toEqual([
      {
        path: '/paths/~1api~1test~1{id}/get/parameters/0/required',
        message: 'Path parameter "id" must set `required: true`.',
        ruleId: 'compatibility-rules-plugin/path-parameters-required',
      },
    ]);
  });
});
