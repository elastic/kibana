/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitModulesByServerRunFlags } from './module_split';
import type { ModuleDiscoveryInfo } from './pick_scout_test_group_run_order';

const makeModule = (overrides: Partial<ModuleDiscoveryInfo>): ModuleDiscoveryInfo => ({
  name: 'm',
  group: 'g',
  type: 'plugin',
  configs: [],
  ...overrides,
});

const makeConfig = (overrides: Partial<ModuleDiscoveryInfo['configs'][number]>) => ({
  path: 'a/b/playwright.config.ts',
  hasTests: true,
  tags: [] as string[],
  serverRunFlags: [] as string[],
  usesParallelWorkers: false,
  ...overrides,
});

describe('splitModulesByServerRunFlags', () => {
  it('returns non-matching modules unchanged', () => {
    const modules = [
      makeModule({
        name: 'pluginA',
        configs: [
          makeConfig({
            serverRunFlags: ['--arch stateful --domain classic', '--arch serverless --domain search'],
          }),
        ],
      }),
    ];

    const result = splitModulesByServerRunFlags(modules);

    expect(result).toEqual(modules);
    expect(result[0]).toBe(modules[0]);
  });

  it('splits a heavy module into one virtual module per (arch, domain)', () => {
    const modules = [
      makeModule({
        name: 'streams_app',
        group: 'observability',
        type: 'plugin',
        configs: [
          makeConfig({
            path: 'x-pack/.../streams_app/playwright.config.ts',
            tags: ['@local-stateful-classic', '@cloud-serverless-search'],
            serverRunFlags: [
              '--arch stateful --domain classic',
              '--arch serverless --domain search',
            ],
          }),
        ],
      }),
    ];

    const result = splitModulesByServerRunFlags(modules);

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.name)).toEqual([
      'streams_app-stateful-classic',
      'streams_app-serverless-search',
    ]);
    for (const split of result) {
      expect(split.group).toBe('observability');
      expect(split.type).toBe('plugin');
      expect(split.configs).toHaveLength(1);
      expect(split.configs[0].serverRunFlags).toHaveLength(1);
    }
  });

  it('keeps only configs that support a given mode in the matching split module', () => {
    const modules = [
      makeModule({
        name: 'dashboard',
        configs: [
          makeConfig({
            path: 'a/playwright.config.ts',
            serverRunFlags: ['--arch stateful --domain classic'],
          }),
          makeConfig({
            path: 'b/playwright.config.ts',
            serverRunFlags: ['--arch serverless --domain search'],
          }),
          makeConfig({
            path: 'c/playwright.config.ts',
            serverRunFlags: [
              '--arch stateful --domain classic',
              '--arch serverless --domain search',
            ],
          }),
        ],
      }),
    ];

    const [stateful, serverless] = splitModulesByServerRunFlags(modules);

    expect(stateful.name).toBe('dashboard-stateful-classic');
    expect(stateful.configs.map((c) => c.path)).toEqual([
      'a/playwright.config.ts',
      'c/playwright.config.ts',
    ]);
    expect(stateful.configs.every((c) => c.serverRunFlags.length === 1)).toBe(true);
    expect(stateful.configs[1].serverRunFlags).toEqual(['--arch stateful --domain classic']);

    expect(serverless.name).toBe('dashboard-serverless-search');
    expect(serverless.configs.map((c) => c.path)).toEqual([
      'b/playwright.config.ts',
      'c/playwright.config.ts',
    ]);
    expect(serverless.configs[1].serverRunFlags).toEqual(['--arch serverless --domain search']);
  });

  it('preserves isAffected on every split-out virtual module', () => {
    const modules = [
      makeModule({
        name: 'streams_app_api',
        isAffected: true,
        configs: [
          makeConfig({
            serverRunFlags: [
              '--arch stateful --domain classic',
              '--arch serverless --domain search',
            ],
          }),
        ],
      }),
    ];

    const result = splitModulesByServerRunFlags(modules);

    expect(result).toHaveLength(2);
    expect(result.every((m) => m.isAffected === true)).toBe(true);
  });

  it('returns the original module unchanged when it has no serverRunFlags', () => {
    const modules = [
      makeModule({
        name: 'streams_app',
        configs: [makeConfig({ serverRunFlags: [] })],
      }),
    ];

    const result = splitModulesByServerRunFlags(modules);

    expect(result).toEqual(modules);
  });

  it('respects a custom heavyModuleFragments option', () => {
    const modules = [
      makeModule({
        name: 'streams_app',
        configs: [makeConfig({ serverRunFlags: ['--arch stateful --domain classic'] })],
      }),
      makeModule({
        name: 'custom_heavy',
        configs: [
          makeConfig({
            serverRunFlags: [
              '--arch stateful --domain classic',
              '--arch serverless --domain search',
            ],
          }),
        ],
      }),
    ];

    const result = splitModulesByServerRunFlags(modules, { heavyModuleFragments: ['custom_heavy'] });

    expect(result.map((m) => m.name)).toEqual([
      'streams_app',
      'custom_heavy-stateful-classic',
      'custom_heavy-serverless-search',
    ]);
  });

  it('falls back to a sanitized suffix when a flag is not the standard "--arch X --domain Y" shape', () => {
    const modules = [
      makeModule({
        name: 'dashboard',
        configs: [makeConfig({ serverRunFlags: ['--legacy=mode'] })],
      }),
    ];

    const [virtualModule] = splitModulesByServerRunFlags(modules);

    expect(virtualModule.name).toBe('dashboard-legacy-mode');
  });

  it('does not mutate input modules', () => {
    const original = makeModule({
      name: 'streams_app',
      configs: [
        makeConfig({
          serverRunFlags: [
            '--arch stateful --domain classic',
            '--arch serverless --domain search',
          ],
        }),
      ],
    });
    const snapshot = JSON.parse(JSON.stringify(original));

    splitModulesByServerRunFlags([original]);

    expect(original).toEqual(snapshot);
  });
});
