/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../affected-packages', () => ({
  ALWAYS_RUN_JEST_INTEGRATION_CONFIGS: ['always/jest.integration.config.js'],
  CRITICAL_FILES_JEST_INTEGRATION_TESTS: ['CRITICAL_INT'],
  CRITICAL_FILES_JEST_UNIT_TESTS: ['CRITICAL_UNIT'],
  getAffectedPackages: jest.fn(),
  listChangedFiles: jest.fn(),
  filterFilesByPackages: (files: string[], pkgs: Set<string>) =>
    files.filter((f) => [...pkgs].some((pkg) => f.startsWith(pkg))),
  touchedCriticalFiles: (files: string[], critical: string[]) =>
    files.some((f) => critical.includes(f)),
}));

jest.mock('./jest_configs', () => ({ SHARD_ANNOTATION_SEP: '||shard=' }));

import type { SelectiveTestingContext } from './selective_testing';
import {
  filterJestIntegrationConfigsByAffected,
  filterJestUnitConfigsByAffected,
} from './selective_testing';

const context = (
  affected: string[],
  changed: string[] = ['irrelevant.ts']
): SelectiveTestingContext => ({
  affectedPackages: new Set(affected),
  prChangedFiles: changed,
});

describe('filterJestIntegrationConfigsByAffected', () => {
  it('drops unaffected configs but re-adds always-run configs', () => {
    const configs = [
      'always/jest.integration.config.js',
      'other/jest.integration.config.js',
      'affected/jest.integration.config.js',
    ];

    const result = filterJestIntegrationConfigsByAffected(configs, context(['affected/']));

    expect(result).toEqual(
      expect.arrayContaining([
        'always/jest.integration.config.js',
        'affected/jest.integration.config.js',
      ])
    );
    expect(result).not.toContain('other/jest.integration.config.js');
  });

  it('re-adds an always-run config even when no package is affected', () => {
    const configs = ['always/jest.integration.config.js', 'other/jest.integration.config.js'];

    const result = filterJestIntegrationConfigsByAffected(configs, context([]));

    expect(result).toEqual(['always/jest.integration.config.js']);
  });

  it('restores every shard of an always-run config', () => {
    const configs = [
      'always/jest.integration.config.js||shard=1/2',
      'always/jest.integration.config.js||shard=2/2',
      'other/jest.integration.config.js',
    ];

    const result = filterJestIntegrationConfigsByAffected(configs, context(['nothing/']));

    expect(result).toEqual([
      'always/jest.integration.config.js||shard=1/2',
      'always/jest.integration.config.js||shard=2/2',
    ]);
  });

  it('returns all configs unchanged when a critical file changed', () => {
    const configs = ['other/jest.integration.config.js'];

    const result = filterJestIntegrationConfigsByAffected(configs, context([], ['CRITICAL_INT']));

    expect(result).toEqual(configs);
  });
});

describe('filterJestUnitConfigsByAffected', () => {
  it('does not force always-run integration configs into unit runs', () => {
    const configs = ['always/jest.integration.config.js', 'affected/jest.config.js'];

    const result = filterJestUnitConfigsByAffected(configs, context(['affected/']));

    expect(result).toEqual(['affected/jest.config.js']);
  });
});
