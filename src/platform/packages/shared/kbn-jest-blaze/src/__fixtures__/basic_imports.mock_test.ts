/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable @kbn/imports/no_unresolvable_imports */
// Test file to verify basic import rewriting functionality
// @ts-expect-error
import { someUtility } from './test-utils';
// @ts-expect-error
import { helperFunction } from './helpers/helper';
// @ts-expect-error
import defaultExport from './some-package';
// @ts-expect-error
import * as allExports from './another-package';

describe('Basic Import Tests', () => {
  test('should handle named imports', () => {
    expect(typeof someUtility).toBe('function');
    expect(someUtility).toBeDefined();
  });

  test('should handle relative imports', () => {
    expect(typeof helperFunction).toBe('function');
    expect(helperFunction()).toBe('helper result');
  });

  test('should handle default imports', () => {
    expect(defaultExport).toBeDefined();
    expect(typeof defaultExport).toBe('object');
  });

  test('should handle namespace imports', () => {
    expect(allExports).toBeDefined();
    expect(typeof allExports).toBe('object');
  });
});
