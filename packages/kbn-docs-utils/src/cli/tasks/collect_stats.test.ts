/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { collectStats } from './collect_stats';
import type { CliOptions, SetupProjectResult, BuildApiMapResult } from '../types';

// Mock dependencies
jest.mock('../../stats');
jest.mock('../../count_eslint_disable');
jest.mock('../../count_enzyme_imports');

const { collectApiStatsForPlugin } = jest.requireMock('../../stats');
const { countEslintDisableLines } = jest.requireMock('../../count_eslint_disable');
const { countEnzymeImports } = jest.requireMock('../../count_enzyme_imports');

describe('collectStats', () => {
  let log: ToolingLog;
  let transaction: any;
  let setupResult: SetupProjectResult;
  let apiMapResult: BuildApiMapResult;

  beforeEach(() => {
    log = new ToolingLog({
      level: 'silent',
      writeTo: process.stdout,
    });

    transaction = {
      startSpan: jest.fn(() => ({
        end: jest.fn(),
      })),
    };

    const mockPlugin = {
      id: 'test-plugin',
      directory: 'src/plugins/test',
      isPlugin: true,
      manifest: {
        id: 'test-plugin',
        owner: { name: 'test-team' },
        description: 'Test plugin',
        serviceFolders: [],
      },
      manifestPath: 'src/plugins/test/kibana.json',
    };

    setupResult = {
      plugins: [mockPlugin],
      pathsByPlugin: new Map([[mockPlugin, ['src/plugins/test/public/index.ts']]]),
      project: {} as any,
    };

    apiMapResult = {
      pluginApiMap: {
        'test-plugin': {
          id: 'test-plugin',
          client: [],
          server: [],
          common: [],
        },
      },
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    };

    (collectApiStatsForPlugin as jest.Mock).mockReturnValue({
      apiCount: 0,
      missingComments: [],
      isAnyType: [],
      noReferences: [],
      missingExports: 0,
      deprecatedAPIsReferencedCount: 0,
      unreferencedDeprecatedApisCount: 0,
      adoptionTrackedAPIs: [],
      adoptionTrackedAPIsCount: 0,
      adoptionTrackedAPIsUnreferencedCount: 0,
    });

    (countEslintDisableLines as jest.Mock).mockResolvedValue({
      eslintDisableLineCount: 0,
      eslintDisableFileCount: 0,
    });

    (countEnzymeImports as jest.Mock).mockResolvedValue({
      enzymeImportCount: 0,
    });
  });

  it('collects stats for all plugins', async () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    const result = await collectStats(setupResult, apiMapResult, log, transaction, options);

    expect(result).toBeDefined();
    expect(result['test-plugin']).toBeDefined();
    expect(result['test-plugin'].owner).toBeDefined();
    expect(result['test-plugin'].description).toBeDefined();
    expect(result['test-plugin'].isPlugin).toBe(true);
  });

  it('skips plugins when stats and pluginFilter are provided', async () => {
    const options: CliOptions = {
      collectReferences: false,
      stats: ['any'],
      pluginFilter: ['other-plugin'],
    };

    const result = await collectStats(setupResult, apiMapResult, log, transaction, options);

    expect(result['test-plugin']).toBeUndefined();
  });

  it('calls countEslintDisableLines and countEnzymeImports', async () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    await collectStats(setupResult, apiMapResult, log, transaction, options);

    expect(countEslintDisableLines).toHaveBeenCalled();
    expect(countEnzymeImports).toHaveBeenCalled();
  });
});
