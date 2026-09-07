/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';

jest.mock('fs', () => {
  const fsReal = jest.requireActual('fs');
  return {
    ...fsReal,
    readFileSync: jest.fn((filePath) => {
      if (filePath.endsWith('package.json')) {
        return '{ "name": "kibana" }';
      } else if (filePath.endsWith('yarn.lock')) {
        return '';
      }
      return '';
    }),
    writeFileSync: jest.fn(),
  };
});

import { checkSemverRanges } from '.';

describe('checkSemverRanges', () => {
  it('should not report errors when no semver ranges are present', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        lodash: '4.17.21',
      },
      devDependencies: {
        typescript: '4.9.5',
      },
    });

    const yarnLock = `
lodash@4.17.21:
  version "4.17.21"
typescript@4.9.5:
  version "4.9.5"
`;

    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      yarnLockContent: yarnLock,
    });
    expect(result.totalFixes).toBe(0);
  });

  it('should fix semver ranges in package.json', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        lodash: '^4.17.21',
      },
      devDependencies: {
        typescript: '~4.9.5',
      },
    });

    const yarnLock = `
lodash@^4.17.21:
  version "4.17.21"
typescript@~4.9.5:
  version "4.9.5"
`;

    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      yarnLockContent: yarnLock,
      fix: true,
    });
    expect(result.totalFixes).toBe(2);
    expect(result.fixesPerField).toEqual({
      dependencies: 1,
      devDependencies: 1,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(
        {
          dependencies: {
            lodash: '4.17.21',
          },
          devDependencies: {
            typescript: '4.9.5',
          },
        },
        null,
        2
      )
    );
  });

  it(`finds the correct version bump in the yarn.lock`, () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        lodash: '^4.17.20',
      },
    });
    const yarnLock = `
lodash@^5.22.23:
  version "5.29.0"
lodash@^4.17.20:
  version "4.17.20"
`;
    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      yarnLockContent: yarnLock,
      fix: true,
    });

    expect(result.totalFixes).toBe(1);
    expect(result.fixesPerField).toEqual({
      dependencies: 1,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(
        {
          dependencies: {
            lodash: '4.17.20',
          },
        },
        null,
        2
      )
    );
  });

  it('should throw an error if a version cannot be resolved from yarn.lock', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        lodash: '^4.17.21',
      },
    });

    const yarnLock = `
# Empty yarn.lock
`;

    expect(() =>
      checkSemverRanges({
        pkgJsonContent: pkgJson,
        yarnLockContent: yarnLock,
      })
    ).toThrow('Could not resolve version for lodash with version ^4.17.21 from yarn.lock');
  });

  it(`doesn't pick the @types version`, () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        'chroma-js': '^2.1.0',
      },
    });

    const yarnLock = `
@types/chroma-js@^2.1.0:
  version "2.1.1"
chroma-js@^2.1.0:
  version "2.1.0"
`;

    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      yarnLockContent: yarnLock,
      fix: true,
    });

    expect(result.totalFixes).toBe(1);
    expect(result.fixesPerField).toEqual({
      dependencies: 1,
    });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify(
        {
          dependencies: {
            'chroma-js': '2.1.0',
          },
        },
        null,
        2
      )
    );
  });
});
