/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../affected-packages/index.ts', () => ({
  CRITICAL_FILES_JEST_INTEGRATION_TESTS: ['CRITICAL_INT'],
  CRITICAL_FILES_JEST_UNIT_TESTS: ['CRITICAL_UNIT'],
  getAffectedPackages: jest.fn(),
  listChangedFiles: jest.fn(),
  filterFilesByPackages: (files: string[], pkgs: Set<string>) =>
    files.filter((f) => [...pkgs].some((pkg) => f.startsWith(pkg))),
  touchedCriticalFiles: (files: string[], critical: string[]) =>
    files.some((f) => critical.includes(f)),
}));

import type { SelectiveTestingContext } from './selective_testing.ts';
import {
  filterJestIntegrationConfigsByAffected,
  filterJestUnitConfigsByAffected,
} from './selective_testing.ts';

const context = (
  affected: string[],
  changed: string[] = ['irrelevant.ts']
): SelectiveTestingContext => ({
  affectedPackages: new Set(affected),
  prChangedFiles: changed,
});

describe('filterJestIntegrationConfigsByAffected', () => {
  it('keeps package-selected configs while comparing Moon integration selection', () => {
    const configs = [
      'affected/one/jest.integration.config.js',
      'affected/two/jest.integration.config.js',
    ];
    const result = filterJestIntegrationConfigsByAffected(
      configs,
      context(['affected/'], ['affected/one/example.test.ts']),
      {
        modeledConfigs: new Set(configs),
        affectedConfigs: new Set([configs[0]]),
      }
    );
    expect(result).toEqual(configs);
  });
});

describe('filterJestUnitConfigsByAffected', () => {
  it('keeps package-selected configs while comparing Moon unit selection', () => {
    const configs = ['affected/one/jest.config.js', 'affected/two/jest.config.js'];
    const result = filterJestUnitConfigsByAffected(
      configs,
      context(['affected/'], ['affected/one/example.test.ts']),
      {
        modeledConfigs: new Set(configs),
        affectedConfigs: new Set([configs[0]]),
      }
    );
    expect(result).toEqual(configs);
  });

  it('logs Moon-only configs without changing package selection', () => {
    const configs = ['affected/jest.config.js', 'other/jest.config.js', 'nested/jest.config.js'];
    const result = filterJestUnitConfigsByAffected(configs, context(['nested/']), {
      modeledConfigs: new Set(['affected/jest.config.js', 'other/jest.config.js']),
      affectedConfigs: new Set(['affected/jest.config.js']),
    });

    expect(result).toEqual(['nested/jest.config.js']);
  });

  it('keeps package-selected configs when Moon misses a modeled config', () => {
    const configs = ['modeled/jest.config.js'];
    expect(
      filterJestUnitConfigsByAffected(configs, context(['modeled/']), {
        modeledConfigs: new Set(configs),
        affectedConfigs: new Set(),
      })
    ).toEqual(configs);
  });

  it('does not select unmodeled configs when no package has a Jest-relevant change', () => {
    const configs = ['modeled/jest.config.js', 'nested/jest.config.js'];
    expect(
      filterJestUnitConfigsByAffected(configs, context([]), {
        modeledConfigs: new Set(['modeled/jest.config.js']),
        affectedConfigs: new Set(),
      })
    ).toEqual([]);
  });

  it('keeps critical changes as a full Jest run even when Moon finds no affected task', () => {
    const configs = ['affected/jest.config.js', 'other/jest.config.js'];
    expect(
      filterJestUnitConfigsByAffected(configs, context([], ['CRITICAL_UNIT']), {
        modeledConfigs: new Set(configs),
        affectedConfigs: new Set(),
      })
    ).toEqual(configs);
  });
});
