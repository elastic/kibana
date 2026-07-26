/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleDiscoveryInfo } from './types';
import { countModulesByType, flattenModulesByServerRunFlag } from './transform_utils';

describe('countModulesByType', () => {
  it('counts plugins and packages', () => {
    const modules: ModuleDiscoveryInfo[] = [
      { name: 'a', group: 'platform', type: 'plugin', configs: [] },
      { name: 'b', group: 'platform', type: 'plugin', configs: [] },
      { name: 'c', group: 'search', type: 'package', configs: [] },
    ];
    expect(countModulesByType(modules)).toEqual({ plugins: 2, packages: 1 });
  });

  it('returns zeros for empty input', () => {
    expect(countModulesByType([])).toEqual({ plugins: 0, packages: 0 });
  });
});

describe('flattenModulesByServerRunFlag', () => {
  it('groups configs by arch, group, and server run flag', () => {
    const modules: ModuleDiscoveryInfo[] = [
      {
        name: 'myPlugin',
        group: 'platform',
        type: 'plugin',
        configs: [
          {
            path: '/path/to/api/config',
            hasTests: true,
            tags: ['@local-stateful-classic'],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];
    const result = flattenModulesByServerRunFlag(modules);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      testTarget: { arch: 'stateful', domain: 'classic' },
      group: 'platform',
      scoutCommand:
        'node scripts/scout run-tests --location cloud --arch stateful --domain classic',
      configs: ['/path/to/api/config'],
    });
  });

  it('maps search group to search domain for stateful', () => {
    const modules: ModuleDiscoveryInfo[] = [
      {
        name: 'searchPlugin',
        group: 'search',
        type: 'plugin',
        configs: [
          {
            path: '/path/config',
            hasTests: true,
            tags: [],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];
    const result = flattenModulesByServerRunFlag(modules);
    expect(result[0].testTarget.domain).toBe('search');
  });

  it('maps serverless serverRunFlag to domain', () => {
    const modules: ModuleDiscoveryInfo[] = [
      {
        name: 'obltPlugin',
        group: 'observability',
        type: 'plugin',
        configs: [
          {
            path: '/path/config',
            hasTests: true,
            tags: [],
            serverRunFlags: ['--arch serverless --domain observability_complete'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];
    const result = flattenModulesByServerRunFlag(modules);
    expect(result[0].testTarget).toEqual({
      arch: 'serverless',
      domain: 'observability_complete',
    });
    expect(result[0].scoutCommand).toContain('--arch serverless --domain observability_complete');
  });

  it('aggregates config paths for same group and server run flag', () => {
    const modules: ModuleDiscoveryInfo[] = [
      {
        name: 'pluginA',
        group: 'platform',
        type: 'plugin',
        configs: [
          {
            path: '/path/a',
            hasTests: true,
            tags: [],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
      {
        name: 'pluginB',
        group: 'platform',
        type: 'plugin',
        configs: [
          {
            path: '/path/b',
            hasTests: true,
            tags: [],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];
    const result = flattenModulesByServerRunFlag(modules);
    expect(result).toHaveLength(1);
    expect(result[0].configs).toHaveLength(2);
    expect(result[0].configs).toContain('/path/a');
    expect(result[0].configs).toContain('/path/b');
  });

  it('sorts result by arch (stateful first), then group, then scoutCommand', () => {
    const modules: ModuleDiscoveryInfo[] = [
      {
        name: 'serverlessFirst',
        group: 'platform',
        type: 'plugin',
        configs: [
          {
            path: '/s',
            hasTests: true,
            tags: [],
            serverRunFlags: ['--arch serverless --domain search'],
            usesParallelWorkers: false,
          },
        ],
      },
      {
        name: 'statefulFirst',
        group: 'platform',
        type: 'plugin',
        configs: [
          {
            path: '/e',
            hasTests: true,
            tags: [],
            serverRunFlags: ['--arch stateful --domain classic'],
            usesParallelWorkers: false,
          },
        ],
      },
    ];
    const result = flattenModulesByServerRunFlag(modules);
    expect(result).toHaveLength(2);
    expect(result[0].testTarget.arch).toBe('stateful');
    expect(result[1].testTarget.arch).toBe('serverless');
  });

  it('returns empty array for empty input', () => {
    expect(flattenModulesByServerRunFlag([])).toEqual([]);
  });
});
