/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../affected-packages/index.ts', () => ({
  ALWAYS_RUN_JEST_INTEGRATION_CONFIGS: ['always/jest.integration.config.js'],
  CRITICAL_FILES_JEST_INTEGRATION_TESTS: ['CRITICAL_INT', 'broad_int/**'],
  CRITICAL_FILES_JEST_UNIT_TESTS: ['CRITICAL_UNIT', 'global/**/*.ts', 'broad/**'],
  getAffectedPackages: jest.fn(),
  filterFilesByPackages: (files: string[], pkgs: Set<string>) =>
    files.filter((f) => [...pkgs].some((pkg) => f.startsWith(pkg))),
  createScopeMatcher: jest.requireActual('../../affected-packages/utils.ts').createScopeMatcher,
  filterIgnoredFiles: jest.requireActual('../../affected-packages/utils.ts').filterIgnoredFiles,
}));

jest.mock('./jest_configs.ts', () => ({ SHARD_ANNOTATION_SEP: '||shard=' }));

import type { SelectiveTestingContext } from './selective_testing.ts';
import { getAffectedPackages } from '../../affected-packages/index.ts';
import {
  filterJestIntegrationConfigsByAffected,
  filterJestUnitConfigsByAffected,
  resolveSelectiveTestingContext,
} from './selective_testing.ts';

const context = (
  affected: string[],
  changed: string[] = ['irrelevant.ts']
): SelectiveTestingContext => ({
  affectedPackages: new Set(affected),
  changedFiles: changed,
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

  it('does not treat a documentation-only change to a critical file as critical', () => {
    const configs = ['other/jest.integration.config.js', 'affected/jest.integration.config.js'];

    const result = filterJestIntegrationConfigsByAffected(
      configs,
      context(['affected/'], ['broad_int/README.md'])
    );

    expect(result).toEqual(['affected/jest.integration.config.js']);
  });

  it('returns all configs unchanged when a critical file changed', () => {
    const configs = ['other/jest.integration.config.js'];

    const result = filterJestIntegrationConfigsByAffected(configs, context([], ['CRITICAL_INT']));

    expect(result).toEqual(configs);
  });
});

describe('filterJestUnitConfigsByAffected', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not treat documentation-only changes in a critical path as critical', () => {
    const configs = ['other/jest.config.js', 'affected/jest.config.js'];

    const result = filterJestUnitConfigsByAffected(
      configs,
      context(['affected/'], ['broad/README.md', 'broad/docs/guide.md', 'broad/CHANGELOG'])
    );

    expect(result).toEqual(['affected/jest.config.js']);
  });

  it('still treats a critical source file as critical when mixed with documentation changes', () => {
    const configs = ['other/jest.config.js', 'affected/jest.config.js'];

    const result = filterJestUnitConfigsByAffected(
      configs,
      context(['affected/'], ['broad/README.md', 'broad/index.ts'])
    );

    expect(result).toEqual(configs);
  });

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
    const configs = [
      'affected/jest.config.js',
      'other/jest.config.js',
      'nested/jest.config.js||shard=1/2',
    ];
    const result = filterJestUnitConfigsByAffected(configs, context(['nested/']), {
      modeledConfigs: new Set(['affected/jest.config.js', 'other/jest.config.js']),
      affectedConfigs: new Set(['affected/jest.config.js']),
    });

    expect(result).toEqual(['nested/jest.config.js||shard=1/2']);
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

  it('logs critical matches, including glob matches, without including unrelated changes', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const configs = ['other/jest.config.js'];
    expect(
      filterJestUnitConfigsByAffected(
        configs,
        context([], ['CRITICAL_UNIT', 'global/transform/index.ts', 'unrelated.ts'])
      )
    ).toEqual(configs);
    expect(log).toHaveBeenCalledWith(
      'Not filtering Jest unit tests because critical files changed: CRITICAL_UNIT, global/transform/index.ts'
    );
  });

  it('logs all 20 critical paths without an omitted count', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const files = Array.from({ length: 20 }, (_, index) => `global/file_${index}.ts`);

    filterJestUnitConfigsByAffected(['other/jest.config.js'], context([], files));

    expect(log).toHaveBeenCalledWith(
      `Not filtering Jest unit tests because critical files changed: ${files.join(', ')}`
    );
  });

  it('logs the first 20 critical paths followed by the omitted count', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const files = Array.from({ length: 20 }, (_, index) => `global/file_${index}.ts`);

    filterJestUnitConfigsByAffected(
      ['other/jest.config.js'],
      context([], [...files, 'global/omitted.ts', 'unrelated.ts'])
    );

    expect(log).toHaveBeenCalledWith(
      `Not filtering Jest unit tests because critical files changed: ${files.join(
        ', '
      )}, and 1 more`
    );
  });

  it('does not force always-run integration configs into unit runs', () => {
    const configs = ['always/jest.integration.config.js', 'affected/jest.config.js'];

    const result = filterJestUnitConfigsByAffected(configs, context(['affected/']));

    expect(result).toEqual(['affected/jest.config.js']);
  });
});

describe('resolveSelectiveTestingContext', () => {
  it('passes Scout paths through to package selection', async () => {
    jest.mocked(getAffectedPackages).mockResolvedValueOnce(new Set(['affected/']));
    const changedFiles = ['affected/test/scout/ui/example.spec.ts'];

    const result = await resolveSelectiveTestingContext(changedFiles);

    expect(getAffectedPackages).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ changedFiles, includeDownstream: true })
    );
    expect(result?.changedFiles).toBe(changedFiles);
  });

  it('passes documentation ignore patterns to getAffectedPackages', async () => {
    jest.mocked(getAffectedPackages).mockResolvedValueOnce(new Set());

    await resolveSelectiveTestingContext(['src/core/README.md']);

    expect(getAffectedPackages).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        ignorePatterns: expect.arrayContaining(['**/README*', '**/*.md', '**/CHANGELOG*']),
      })
    );
  });

  it('yields an empty affected-packages set for documentation-only changes', async () => {
    // getAffectedPackages returns empty because all files are filtered by ignorePatterns.
    jest.mocked(getAffectedPackages).mockResolvedValueOnce(new Set());

    const result = await resolveSelectiveTestingContext(['src/core/README.md', 'docs/guide.md']);

    expect(result).not.toBeNull();
    expect(result?.affectedPackages.size).toBe(0);
  });

  it('retains the source package when docs are mixed with source changes', async () => {
    jest.mocked(getAffectedPackages).mockResolvedValueOnce(new Set(['src/core/']));

    const result = await resolveSelectiveTestingContext([
      'src/core/server/index.ts',
      'src/core/README.md',
    ]);

    expect(result?.affectedPackages).toContain('src/core/');
  });
});
