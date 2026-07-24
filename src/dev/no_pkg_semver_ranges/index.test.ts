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
      } else if (filePath.endsWith('pnpm-lock.yaml')) {
        return '';
      }
      return '';
    }),
    writeFileSync: jest.fn(),
  };
});

import { checkSemverRanges } from '.';

/** Build a minimal pnpm-lock.yaml root importer from name -> [specifier, version]. */
const lock = (deps: Record<string, [specifier: string, version: string]>) => {
  const lines = ['importers:', '  .:', '    dependencies:'];
  for (const [name, [specifier, version]] of Object.entries(deps)) {
    lines.push(
      `      '${name}':`,
      `        specifier: ${specifier}`,
      `        version: ${version}`
    );
  }
  return lines.join('\n') + '\n';
};

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

    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      pnpmLockContent: lock({
        lodash: ['4.17.21', '4.17.21'],
        typescript: ['4.9.5', '4.9.5'],
      }),
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

    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      pnpmLockContent: lock({
        lodash: ['^4.17.21', '4.17.21'],
        typescript: ['~4.9.5', '4.9.5'],
      }),
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

  it(`finds the resolved version recorded for the matching specifier`, () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        lodash: '^4.17.20',
      },
    });
    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      pnpmLockContent: lock({
        lodash: ['^4.17.20', '4.17.20'],
      }),
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

  it('strips peer-dependency suffixes from the resolved version', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        ai: '^5.0.190',
      },
    });
    const result = checkSemverRanges({
      pkgJsonContent: pkgJson,
      pnpmLockContent: lock({
        ai: ['^5.0.190', '5.0.190(zod@4.4.3)'],
      }),
      fix: true,
    });

    expect(result.totalFixes).toBe(1);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.any(String),
      JSON.stringify({ dependencies: { ai: '5.0.190' } }, null, 2)
    );
  });

  it('should throw an error if a version cannot be resolved from pnpm-lock.yaml', () => {
    const pkgJson = JSON.stringify({
      dependencies: {
        lodash: '^4.17.21',
      },
    });

    expect(() =>
      checkSemverRanges({
        pkgJsonContent: pkgJson,
        pnpmLockContent: lock({}),
      })
    ).toThrow('Could not resolve version for lodash with version ^4.17.21 from pnpm-lock.yaml');
  });
});
