/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import yaml from 'js-yaml';
import type { ModuleDiscoveryInfo } from './types';

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('fs');
jest.mock('fast-glob');
jest.mock('js-yaml');

import { filterModulesByScoutCiConfig } from './search_configs';

describe('filterModulesByScoutCiConfig', () => {
  let mockLog: ToolingLog;
  const mockScoutCiConfig = {
    plugins: {
      enabled: ['pluginA', 'pluginB'],
      disabled: ['pluginC'],
    },
    packages: {
      enabled: ['packageA'],
      disabled: ['packageB'],
    },
  };

  beforeEach(() => {
    mockLog = new ToolingLog({ level: 'verbose', writeTo: process.stdout });
    jest.spyOn(mockLog, 'warning').mockImplementation(jest.fn());
    (fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content');
    (yaml.load as jest.Mock).mockReturnValue(mockScoutCiConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return only enabled plugins and packages', () => {
    const scoutConfigs: ModuleDiscoveryInfo[] = [
      {
        name: 'pluginA',
        group: 'group1',
        type: 'plugin',
        configs: [
          {
            path: 'pluginPathA',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: true,
          },
        ],
      },
      {
        name: 'pluginB',
        group: 'group1',
        type: 'plugin',
        configs: [
          {
            path: 'pluginPathB',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
          {
            path: 'pluginPathB2',
            hasTests: true,
            tags: ['serverless-observability_complete'],
            serverRunFlags: ['--arch serverless --domain observability_complete'],
            usesParallelWorkers: false,
          },
        ],
      },
      {
        name: 'pluginC',
        group: 'group2',
        type: 'plugin',
        configs: [
          {
            path: 'pluginPathC',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: true,
          },
        ],
      },
      {
        name: 'packageA',
        group: 'group1',
        type: 'package',
        configs: [
          {
            path: 'packagePathA',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: true,
          },
        ],
      },
      {
        name: 'packageB',
        group: 'group2',
        type: 'package',
        configs: [
          {
            path: 'packagePathB',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];

    const result = filterModulesByScoutCiConfig(mockLog, scoutConfigs);
    expect(result.length).toBe(3);
    expect(result.find((m: ModuleDiscoveryInfo) => m.name === 'pluginA')).toBeDefined();
    expect(result.find((m: ModuleDiscoveryInfo) => m.name === 'pluginB')).toBeDefined();
    expect(result.find((m: ModuleDiscoveryInfo) => m.name === 'packageA')).toBeDefined();
    expect(result.find((m: ModuleDiscoveryInfo) => m.name === 'pluginC')).toBeUndefined();
    expect(result.find((m: ModuleDiscoveryInfo) => m.name === 'packageB')).toBeUndefined();
  });

  it('should throw an error if plugins or packages are not registered in Scout CI config', () => {
    const scoutConfigs: ModuleDiscoveryInfo[] = [
      {
        name: 'pluginX',
        group: 'groupX',
        type: 'plugin',
        configs: [
          {
            path: 'pluginPathX',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: true,
          },
        ],
      },
      {
        name: 'packageX',
        group: 'groupX',
        type: 'package',
        configs: [
          {
            path: 'packagePathX',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: true,
          },
        ],
      },
    ];

    expect(() => {
      filterModulesByScoutCiConfig(mockLog, scoutConfigs);
    }).toThrow(
      "The following plugin(s)/package(s) are not registered in Scout CI config '.buildkite/scout_ci_config.yml':"
    );
  });

  it('should log a warning for disabled plugins and packages', () => {
    const scoutConfigs: ModuleDiscoveryInfo[] = [
      {
        name: 'pluginC',
        group: 'group2',
        type: 'plugin',
        configs: [
          {
            path: 'pluginPathC',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: true,
          },
        ],
      },
      {
        name: 'packageB',
        group: 'group2',
        type: 'package',
        configs: [
          {
            path: 'packagePathB',
            hasTests: true,
            tags: ['stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];

    filterModulesByScoutCiConfig(mockLog, scoutConfigs);

    expect(mockLog.warning).toHaveBeenCalledWith(
      expect.stringContaining(
        "The following plugin(s)/package(s) are disabled in '.buildkite/scout_ci_config.yml' and will be excluded from CI:"
      )
    );
    expect(mockLog.warning).toHaveBeenCalledWith(expect.stringContaining('pluginC'));
    expect(mockLog.warning).toHaveBeenCalledWith(expect.stringContaining('packageB'));
  });

  it('should preserve configs and tags when filtering modules', () => {
    const scoutConfigs: ModuleDiscoveryInfo[] = [
      {
        name: 'pluginA',
        group: 'group1',
        type: 'plugin',
        configs: [
          {
            path: 'pluginPathA',
            hasTests: true,
            tags: ['stateful-classic', 'serverless-observability_complete'],
            serverRunFlags: [
              '--arch stateful --domain classic',
              '--arch serverless --domain observability_complete',
            ],
            usesParallelWorkers: true,
          },
          {
            path: 'pluginPathA2',
            hasTests: false,
            tags: ['serverless-security_complete'],
            serverRunFlags: ['--arch serverless --domain security_complete'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];

    const result = filterModulesByScoutCiConfig(mockLog, scoutConfigs);
    expect(result.length).toBe(1);
    expect(result[0]?.configs.length).toBe(2);
    expect(result[0]?.configs[0]?.tags).toEqual([
      'stateful-classic',
      'serverless-observability_complete',
    ]);
    expect(result[0]?.configs[1]?.tags).toEqual(['serverless-security_complete']);
  });
});
