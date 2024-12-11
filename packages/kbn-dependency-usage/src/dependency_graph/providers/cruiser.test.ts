/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { identifyDependencyUsageWithCruiser as identifyDependencyUsage } from './cruiser.ts';
import { cruise } from 'dependency-cruiser';

import * as groupBy from '../../lib/group_by_owners.ts';
import * as groupBySource from '../../lib/group_by_source.ts';

const codeOwners: Record<string, string[]> = {
  'plugins/security': ['team_security'],
  'plugins/data_visualization': ['team_visualization'],
  'plugins/data_charts': ['team_visualization'],
  'plugins/analytics': ['team_analytics'],
  'plugins/notification': ['team_alerts', 'team_notifications'],
  'plugins/security_solution/public/entity_analytics/components': ['team_security_analytics'],
  'plugins/security_solution/public/entity_analytics/components/componentA.ts': [
    'team_security_analytics',
  ],
  'plugins/security_solution/public/entity_analytics/components/componentB.ts': [
    'team_security_analytics',
  ],
  'plugins/security_solution/server/lib/analytics/analytics.ts': ['team_security_analytics'],
  'plugins/security_solution/common/api/detection_engine': ['team_security_solution'],
};

jest.mock('dependency-cruiser', () => ({
  cruise: jest.fn(),
}));

const mockCruiseResult = {
  output: {
    summary: {
      violations: [
        {
          from: 'plugins/security',
          to: 'node_modules/rxjs',
        },
        {
          from: 'plugins/data_visualization',
          to: 'node_modules/rxjs',
        },
        {
          from: 'plugins/data_charts',
          to: 'node_modules/rxjs',
        },
        {
          from: 'plugins/analytics',
          to: 'node_modules/rxjs',
        },
        {
          from: 'plugins/analytics',
          to: 'node_modules/@hapi/boom',
        },
      ],
    },
    modules: [
      {
        source: 'node_modules/rxjs',
        dependents: [
          'plugins/security/server/index.ts',
          'plugins/data_charts/public/charts.ts',
          'plugins/data_visualization/public/visualization.ts',
          'plugins/data_visualization/public/ingest.ts',
          'plugins/analytics/server/analytics.ts',
        ],
      },
      {
        source: 'node_modules/@hapi/boom',
        dependents: ['plugins/analytics'],
      },
    ],
  },
};

jest.mock('../../lib/code_owners', () => ({
  getCodeOwnersForFile: jest.fn().mockImplementation((filePath: string) => codeOwners[filePath]),
  getPathsWithOwnersReversed: () => ({}),
}));

describe('identifyDependencyUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should respect collapseDepth param', async () => {
    (cruise as jest.Mock).mockResolvedValue(mockCruiseResult);

    await identifyDependencyUsage([], 'rxjs', {
      groupBy: 'owner',
      collapseDepth: 2,
      summary: false,
    });

    await identifyDependencyUsage([], undefined, {
      groupBy: 'owner',
      collapseDepth: 1,
      summary: false,
    });

    const [, configWithDepth2] = (cruise as jest.Mock).mock.calls[0];
    const [, configWithDepth1] = (cruise as jest.Mock).mock.calls[1];

    expect(configWithDepth2.collapse).toMatchInlineSnapshot(
      `"^(x-pack/plugins|x-pack/packages|src/plugins|packages|src|x-pack/test|x-pack/test_serverless)/([^/]+)/([^/]+)"`
    );

    expect(configWithDepth1.collapse).toMatchInlineSnapshot(
      `"^(x-pack/plugins|x-pack/packages|src/plugins|packages|src|x-pack/test|x-pack/test_serverless)/([^/]+)|^node_modules/(@[^/]+/[^/]+|[^/]+)"`
    );
  });

  it('should group dependencies by codeowners', async () => {
    (cruise as jest.Mock).mockResolvedValue(mockCruiseResult);
    const groupFilesByOwnersSpy = jest.spyOn(groupBy, 'groupFilesByOwners');

    const result = await identifyDependencyUsage([], undefined, {
      groupBy: 'owner',
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(groupFilesByOwnersSpy).toHaveBeenCalledWith(mockCruiseResult.output.summary.violations);

    expect(result).toEqual({
      team_security: {
        modules: ['plugins/security'],
        deps: ['rxjs'],
        teams: ['team_security'],
      },
      team_visualization: {
        modules: ['plugins/data_visualization', 'plugins/data_charts'],
        deps: ['rxjs'],
        teams: ['team_visualization'],
      },
      team_analytics: {
        modules: ['plugins/analytics'],
        deps: ['rxjs', '@hapi/boom'],
        teams: ['team_analytics'],
      },
    });
  });

  it('should group dependencies by source directory', async () => {
    (cruise as jest.Mock).mockResolvedValue(mockCruiseResult);
    const groupFilesByOwnersSpy = jest.spyOn(groupBySource, 'groupBySource');

    const result = await identifyDependencyUsage([], undefined, {
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(groupFilesByOwnersSpy).toHaveBeenCalledWith(mockCruiseResult.output.summary.violations);

    expect(result).toEqual({
      'plugins/security': ['rxjs'],
      'plugins/data_visualization': ['rxjs'],
      'plugins/data_charts': ['rxjs'],
      'plugins/analytics': ['rxjs', '@hapi/boom'],
    });
  });

  it('should search for specific dependency and return full dependents list', async () => {
    (cruise as jest.Mock).mockResolvedValue(mockCruiseResult);
    const result = await identifyDependencyUsage([], 'rxjs', {
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();

    expect(result).toEqual({
      modules: [
        'plugins/security',
        'plugins/data_visualization',
        'plugins/data_charts',
        'plugins/analytics',
      ],
      dependents: {
        rxjs: [
          'plugins/security/server/index.ts',
          'plugins/data_charts/public/charts.ts',
          'plugins/data_visualization/public/visualization.ts',
          'plugins/data_visualization/public/ingest.ts',
          'plugins/analytics/server/analytics.ts',
        ],
      },
    });
  });

  it('should search for specific dependency and return only summary', async () => {
    (cruise as jest.Mock).mockResolvedValue(mockCruiseResult);
    const result = await identifyDependencyUsage([], 'rxjs', {
      collapseDepth: 1,
      summary: true,
    });

    expect(cruise).toHaveBeenCalled();

    expect(result).toEqual({
      modules: [
        'plugins/security',
        'plugins/data_visualization',
        'plugins/data_charts',
        'plugins/analytics',
      ],
    });
  });

  it('should handle empty cruise result', async () => {
    (cruise as jest.Mock).mockResolvedValue({
      output: { summary: { violations: [] }, modules: [] },
    });

    const result = await identifyDependencyUsage([], undefined, {
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should handle no violations', async () => {
    (cruise as jest.Mock).mockResolvedValue({
      output: { summary: { violations: [] }, modules: mockCruiseResult.output.modules },
    });

    const result = await identifyDependencyUsage([], undefined, {
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('should return empty structure if specific dependency name does not exist', async () => {
    (cruise as jest.Mock).mockResolvedValue({
      output: { summary: { violations: [] }, modules: mockCruiseResult.output.modules },
    });

    const result = await identifyDependencyUsage([], 'nonexistent_dependency', {
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(result).toEqual({
      modules: [],
      dependents: {},
    });
  });

  it('should handle unknown ownership when grouping by owner', async () => {
    const customCruiseResult = {
      output: {
        summary: {
          violations: [
            { from: 'plugins/unknown_plugin', to: 'node_modules/some_module' },
            { from: 'plugins/security', to: 'node_modules/rxjs' },
          ],
        },
        modules: [],
      },
    };
    (cruise as jest.Mock).mockResolvedValue(customCruiseResult);

    const result = await identifyDependencyUsage([], undefined, {
      groupBy: 'owner',
      collapseDepth: 1,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(result).toEqual({
      unknown: {
        modules: ['plugins/unknown_plugin'],
        deps: ['some_module'],
        teams: ['unknown'],
      },
      team_security: {
        modules: ['plugins/security'],
        deps: ['rxjs'],
        teams: ['team_security'],
      },
    });
  });

  it('should search for specific dependency and group by owner', async () => {
    const customCruiseResult = {
      output: {
        summary: {
          violations: [
            {
              from: 'plugins/security_solution/public/entity_analytics/components/componentA.ts',
              to: 'node_modules/lodash/fp.js',
            },
            {
              from: 'plugins/security_solution/public/entity_analytics/components/componentB.ts',
              to: 'node_modules/lodash/partition.js',
            },
            {
              from: 'plugins/security_solution/server/lib/analytics/analytics.ts',
              to: 'node_modules/lodash/partition.js',
            },
            {
              from: 'plugins/security_solution/server/lib/analytics/analytics.ts',
              to: 'node_modules/lodash/cloneDeep.js',
            },
            {
              from: 'plugins/security_solution/common/api/detection_engine',
              to: 'node_modules/lodash/sortBy.js',
            },
          ],
        },
        modules: [],
      },
    };
    (cruise as jest.Mock).mockResolvedValue(customCruiseResult);

    const result = await identifyDependencyUsage([], 'lodash', {
      groupBy: 'owner',
      collapseDepth: 3,
      summary: false,
    });

    expect(cruise).toHaveBeenCalled();
    expect(result).toEqual({
      team_security_analytics: {
        modules: [
          'plugins/security_solution/public/entity_analytics/components/componentA.ts',
          'plugins/security_solution/public/entity_analytics/components/componentB.ts',
          'plugins/security_solution/server/lib/analytics/analytics.ts',
        ],
        deps: ['lodash/fp.js', 'lodash/partition.js', 'lodash/cloneDeep.js'],
        teams: ['team_security_analytics'],
      },
      team_security_solution: {
        modules: ['plugins/security_solution/common/api/detection_engine'],
        deps: ['lodash/sortBy.js'],
        teams: ['team_security_solution'],
      },
    });
  });
});
