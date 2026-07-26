/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collectDependencyVersionLines } from './extract_version_dependencies';

describe('collectDependencyVersionLines', () => {
  const rootPackageJsonContent = JSON.stringify({
    dependencies: {
      alpha: '^1.0.0',
      gamma: '^3.0.0',
    },
  });

  const yarnLockContent = `
alpha@^1.0.0:
  version "1.0.1"
  dependencies:
    beta "^1.0.0"
    optional-child "^1.0.0"

beta@^1.0.0:
  version "1.1.0"
  dependencies:
    shared "^1.0.0"

optional-child@^1.0.0:
  version "1.0.2"
  optionalDependencies:
    shared "^2.0.0"

gamma@^3.0.0:
  version "3.0.0"
  dependencies:
    shared "^2.0.0"

shared@^1.0.0:
  version "1.2.0"

shared@^2.0.0:
  version "2.3.0"
`;

  it('returns direct resolved dependency versions when transitive is false', () => {
    expect(
      collectDependencyVersionLines({
        dependencies: ['alpha', 'gamma'],
        rootPackageJsonContent,
        transitive: false,
        yarnLockContent,
      })
    ).toEqual(['alpha@1.0.1', 'gamma@3.0.0']);
  });

  it('returns the full transitive closure including optional dependencies', () => {
    expect(
      collectDependencyVersionLines({
        dependencies: ['alpha'],
        rootPackageJsonContent,
        transitive: true,
        yarnLockContent,
      })
    ).toEqual([
      'alpha@1.0.1',
      'beta@1.1.0',
      'optional-child@1.0.2',
      'shared@1.2.0',
      'shared@2.3.0',
    ]);
  });

  it('keeps multiple resolved versions of the same package when they are both in the closure', () => {
    expect(
      collectDependencyVersionLines({
        dependencies: ['alpha', 'gamma'],
        rootPackageJsonContent,
        transitive: true,
        yarnLockContent,
      })
    ).toEqual([
      'alpha@1.0.1',
      'beta@1.1.0',
      'gamma@3.0.0',
      'optional-child@1.0.2',
      'shared@1.2.0',
      'shared@2.3.0',
    ]);
  });

  it('throws when a requested root dependency is not declared in package.json', () => {
    expect(() =>
      collectDependencyVersionLines({
        dependencies: ['missing'],
        rootPackageJsonContent,
        transitive: true,
        yarnLockContent,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Unable to find missing in the root package.json dependency list"`
    );
  });
});
