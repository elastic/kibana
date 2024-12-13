/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identifyDependencyOwnership } from './dependency_ownership';
import { parseConfig } from './parse_config';

jest.mock('./parse_config', () => ({
  parseConfig: jest.fn(),
}));

describe('identifyDependencyOwnership', () => {
  const mockConfig = {
    renovateRules: [
      {
        reviewers: ['team:elastic', 'team:infra'],
        matchPackageNames: ['lodash', 'react'],
        enabled: true,
      },
      {
        reviewers: ['team:ui'],
        matchPackageNames: ['@testing-library/react'],
        enabled: true,
      },
      {
        reviewers: ['team:disabled-team'],
        matchPackageNames: ['disabled-package'],
        enabled: false, // Disabled rule
      },
    ],
    packageDependencies: ['lodash', 'react'],
    packageDevDependencies: ['jest', '@testing-library/react'],
  };

  beforeEach(() => {
    (parseConfig as jest.Mock).mockReturnValue(mockConfig);
  });

  it('returns prod and dev dependencies for a specific owner, considering only enabled rules', () => {
    const result = identifyDependencyOwnership({ owner: '@elastic/elastic' });
    expect(result).toEqual({
      prodDependencies: ['lodash', 'react'],
      devDependencies: [],
    });

    const resultInfra = identifyDependencyOwnership({ owner: '@elastic/infra' });
    expect(resultInfra).toEqual({
      prodDependencies: ['lodash', 'react'],
      devDependencies: [],
    });

    const resultUi = identifyDependencyOwnership({ owner: '@elastic/ui' });
    expect(resultUi).toEqual({
      prodDependencies: [],
      devDependencies: ['@testing-library/react'],
    });

    // Disabled team should have no dependencies
    const resultDisabled = identifyDependencyOwnership({ owner: 'team:disabled-team' });
    expect(resultDisabled).toEqual({
      prodDependencies: [],
      devDependencies: [],
    });
  });

  it('returns owners of a specific dependency, considering only enabled rules', () => {
    const result = identifyDependencyOwnership({ dependency: 'lodash' });
    expect(result).toEqual(['@elastic/elastic', '@elastic/infra']);

    const resultUi = identifyDependencyOwnership({ dependency: '@testing-library/react' });
    expect(resultUi).toEqual(['@elastic/ui']);

    const resultDisabled = identifyDependencyOwnership({ dependency: 'disabled-package' });
    expect(resultDisabled).toEqual([]); // Disabled rule, no owners
  });

  it('returns uncovered dependencies when missingOwner is true', () => {
    const result = identifyDependencyOwnership({ missingOwner: true });
    expect(result).toEqual({
      prodDependencies: [],
      devDependencies: ['jest'],
    });
  });

  it('returns comprehensive ownership coverage, considering only enabled rules', () => {
    const result = identifyDependencyOwnership({});
    expect(result).toEqual({
      prodDependenciesByOwner: {
        '@elastic/elastic': ['lodash', 'react'],
        '@elastic/infra': ['lodash', 'react'],
        '@elastic/ui': [],
        '@elastic/disabled-team': [],
      },
      devDependenciesByOwner: {
        '@elastic/elastic': [],
        '@elastic/infra': [],
        '@elastic/ui': ['@testing-library/react'],
        '@elastic/disabled-team': [],
      },
      uncoveredProdDependencies: [],
      uncoveredDevDependencies: ['jest'],
      coveredProdDependencies: ['lodash', 'react'],
      coveredDevDependencies: ['@testing-library/react'],
    });
  });

  it('handles scenarios with no matching rules or dependencies', () => {
    (parseConfig as jest.Mock).mockReturnValue({
      renovateRules: [],
      packageDependencies: ['lodash', 'react'],
      packageDevDependencies: ['jest'],
    });

    const result = identifyDependencyOwnership({});
    expect(result).toEqual({
      prodDependenciesByOwner: {},
      devDependenciesByOwner: {},
      uncoveredProdDependencies: ['lodash', 'react'],
      uncoveredDevDependencies: ['jest'],
      coveredProdDependencies: [],
      coveredDevDependencies: [],
    });
  });

  it('ignores disabled rules in coverage calculations', () => {
    const result = identifyDependencyOwnership({});
    // @ts-expect-error
    expect(result.coveredProdDependencies).not.toContain('disabled-package');
  });
});
