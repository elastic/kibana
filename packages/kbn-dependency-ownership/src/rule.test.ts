/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ruleCoversDependency } from './rule';

describe('ruleCoversDependency', () => {
  const mockRule = {
    matchPackageNames: ['lodash'],
    matchPackagePatterns: ['^react'],
    matchDepNames: ['@testing-library/react'],
    matchDepPatterns: ['^jest'],
    excludePackageNames: ['lodash'],
    excludePackagePatterns: ['^react-dom'],
  };

  it('returns true when a dependency is included and not excluded', () => {
    expect(ruleCoversDependency(mockRule, '@testing-library/react')).toBe(true);
    expect(ruleCoversDependency(mockRule, 'jest-mock')).toBe(true);
  });

  it('returns false when a dependency is excluded', () => {
    expect(ruleCoversDependency(mockRule, 'lodash')).toBe(false); // Excluded by name
    expect(ruleCoversDependency(mockRule, 'react-dom')).toBe(false); // Excluded by pattern
  });

  it('returns true for included dependencies by pattern', () => {
    expect(ruleCoversDependency(mockRule, 'react-redux')).toBe(true); // Matches ^react
  });

  it('returns false when no match is found', () => {
    expect(ruleCoversDependency(mockRule, 'unknown-package')).toBe(false);
  });
});
