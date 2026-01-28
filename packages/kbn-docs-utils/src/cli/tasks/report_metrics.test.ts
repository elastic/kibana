/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { reportMetrics } from './report_metrics';
import type { CliOptions, SetupProjectResult, BuildApiMapResult, AllPluginStats } from '../types';

// Mock dependencies
jest.mock('@kbn/ci-stats-reporter', () => ({
  CiStatsReporter: {
    fromEnv: jest.fn(() => ({
      metrics: jest.fn(),
    })),
  },
}));

import { CiStatsReporter } from '@kbn/ci-stats-reporter';

describe('reportMetrics', () => {
  let log: ToolingLog;
  let transaction: any;
  let setupResult: SetupProjectResult;
  let apiMapResult: BuildApiMapResult;
  let allPluginStats: AllPluginStats;
  let mockReporter: any;

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

    mockReporter = {
      metrics: jest.fn(),
    };

    (CiStatsReporter.fromEnv as jest.Mock).mockReturnValue(mockReporter);

    const mockPlugin = {
      id: 'test-plugin',
      directory: 'src/plugins/test',
      isPlugin: true,
      manifest: {
        id: 'test-plugin',
        owner: { name: 'test-team' },
        serviceFolders: [],
      },
      manifestPath: 'src/plugins/test/kibana.json',
    };

    setupResult = {
      plugins: [mockPlugin],
      pathsByPlugin: new Map(),
      project: {} as any,
    };

    apiMapResult = {
      pluginApiMap: {},
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    };

    allPluginStats = {
      'test-plugin': {
        apiCount: 5,
        missingComments: [],
        isAnyType: [],
        noReferences: [],
        missingExports: 0,
        deprecatedAPIsReferencedCount: 0,
        unreferencedDeprecatedApisCount: 0,
        adoptionTrackedAPIs: [],
        adoptionTrackedAPIsCount: 0,
        adoptionTrackedAPIsUnreferencedCount: 0,
        owner: { name: 'test-team' },
        description: 'Test plugin',
        isPlugin: true,
        eslintDisableLineCount: 0,
        eslintDisableFileCount: 0,
        enzymeImportCount: 0,
      },
    };
  });

  it('reports metrics to CI stats reporter', () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    reportMetrics(setupResult, apiMapResult, allPluginStats, log, transaction, options);

    expect(mockReporter.metrics).toHaveBeenCalled();
    expect(mockReporter.metrics.mock.calls[0][0]).toBeInstanceOf(Array);
    expect(mockReporter.metrics.mock.calls[0][0].length).toBeGreaterThan(0);
  });

  it('includes all expected metric groups', () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    reportMetrics(setupResult, apiMapResult, allPluginStats, log, transaction, options);

    const metrics = mockReporter.metrics.mock.calls[0][0];
    const groups = metrics.map((m: any) => m.group);

    expect(groups).toContain('API count');
    expect(groups).toContain('API count missing comments');
    expect(groups).toContain('API count with any type');
    expect(groups).toContain('ESLint disabled line counts');
    expect(groups).toContain('Enzyme imports');
  });

  it('filters plugins based on pluginFilter', () => {
    const options: CliOptions = {
      collectReferences: false,
      pluginFilter: ['other-plugin'],
    };

    reportMetrics(setupResult, apiMapResult, allPluginStats, log, transaction, options);

    // Should not report metrics for filtered-out plugins
    expect(mockReporter.metrics).not.toHaveBeenCalled();
  });
});
