/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  mockCreatePluginPrebootSetupContext,
  mockCreatePluginSetupContext,
  mockCreatePluginStartContext,
  runtimeResolverMock,
} from './plugins_system.test.mocks';

import { BehaviorSubject } from 'rxjs';

import { REPO_ROOT } from '@kbn/repo-info';
import { type PluginName, PluginType } from '@kbn/core-base-common';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { Logger } from '@kbn/logging';
import { Env } from '@kbn/config';
import { configServiceMock, getEnvOptions } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { PluginWrapper } from './plugin';
import { PluginsSystem } from './plugins_system';
import { coreInternalLifecycleMock } from '@kbn/core-lifecycle-server-mocks';

function createPlugin(
  id: string,
  {
    required = [],
    optional = [],
    server = true,
    ui = true,
    type = PluginType.standard,
  }: {
    required?: string[];
    optional?: string[];
    server?: boolean;
    ui?: boolean;
    type?: PluginType;
  } = {}
): PluginWrapper<any, any> {
  const plugin = new PluginWrapper<any, any>({
    path: 'some-path',
    manifest: {
      id,
      version: 'some-version',
      configPath: 'path',
      kibanaVersion: '7.0.0',
      type,
      requiredPlugins: required,
      optionalPlugins: optional,
      runtimePluginDependencies: [],
      requiredBundles: [],
      server,
      ui,
      owner: { name: 'foo' },
    },
    opaqueId: Symbol(id),
    initializerContext: { logger } as any,
  });
  jest.spyOn(plugin, 'init').mockResolvedValue();
  return plugin;
}

const prebootDeps = coreInternalLifecycleMock.createInternalPreboot();
const setupDeps = coreInternalLifecycleMock.createInternalSetup();
const startDeps = coreInternalLifecycleMock.createInternalStart();

let pluginsSystem: PluginsSystem<PluginType.standard>;
let configService: ReturnType<typeof configServiceMock.create>;
let logger: ReturnType<typeof loggingSystemMock.create>;
let env: Env;
let coreContext: CoreContext;

beforeEach(() => {
  runtimeResolverMock.setDependencyMap.mockReset();
  runtimeResolverMock.resolveSetupRequests.mockReset();
  runtimeResolverMock.resolveStartRequests.mockReset();

  logger = loggingSystemMock.create();
  env = Env.createDefault(REPO_ROOT, getEnvOptions());

  configService = configServiceMock.create();
  configService.atPath.mockReturnValue(new BehaviorSubject({ initialize: true }));

  coreContext = { coreId: Symbol(), env, logger, configService: configService as any };

  pluginsSystem = new PluginsSystem(coreContext, PluginType.standard);
});

test('can be setup even without plugins', async () => {
  const pluginsSetup = await pluginsSystem.setupPlugins(setupDeps);

  expect(pluginsSetup).toBeInstanceOf(Map);
  expect(pluginsSetup.size).toBe(0);
});

test('throws if adding plugin with incompatible type', () => {
  const prebootPlugin = createPlugin('plugin-preboot', { type: PluginType.preboot });
  const standardPlugin = createPlugin('plugin-standard');

  const prebootPluginSystem = new PluginsSystem(coreContext, PluginType.preboot);
  const standardPluginSystem = new PluginsSystem(coreContext, PluginType.standard);

  prebootPluginSystem.addPlugin(prebootPlugin);
  expect(() => prebootPluginSystem.addPlugin(standardPlugin)).toThrowErrorMatchingInlineSnapshot(
    `"Cannot add plugin with type \\"standard\\" to plugin system with type \\"preboot\\"."`
  );
  expect(prebootPluginSystem.getPlugins()).toEqual([prebootPlugin]);

  standardPluginSystem.addPlugin(standardPlugin);
  expect(() => standardPluginSystem.addPlugin(prebootPlugin)).toThrowErrorMatchingInlineSnapshot(
    `"Cannot add plugin with type \\"preboot\\" to plugin system with type \\"standard\\"."`
  );
  expect(standardPluginSystem.getPlugins()).toEqual([standardPlugin]);
});

test('getPlugins returns the list of plugins', () => {
  const pluginA = createPlugin('plugin-a');
  const pluginB = createPlugin('plugin-b');
  pluginsSystem.addPlugin(pluginA);
  pluginsSystem.addPlugin(pluginB);

  expect(pluginsSystem.getPlugins()).toEqual([pluginA, pluginB]);
});

test('getPluginDependencies returns dependency tree with keys topologically sorted', () => {
  pluginsSystem.addPlugin(createPlugin('plugin-a', { required: ['no-dep'] }));
  pluginsSystem.addPlugin(
    createPlugin('plugin-b', { required: ['plugin-a'], optional: ['no-dep', 'other'] })
  );
  pluginsSystem.addPlugin(createPlugin('no-dep'));

  expect(pluginsSystem.getPluginDependencies()).toMatchInlineSnapshot(`
    Object {
      "asNames": Map {
        "no-dep" => Array [],
        "plugin-a" => Array [
          "no-dep",
        ],
        "plugin-b" => Array [
          "plugin-a",
          "no-dep",
        ],
      },
      "asOpaqueIds": Map {
        Symbol(no-dep) => Array [],
        Symbol(plugin-a) => Array [
          Symbol(no-dep),
        ],
        Symbol(plugin-b) => Array [
          Symbol(plugin-a),
          Symbol(no-dep),
        ],
      },
    }
  `);
});

test('`setupPlugins` throws plugin has missing required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('some-id', { required: ['missing-dep'] }));

  await expect(pluginsSystem.setupPlugins(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["some-id"]]`
  );
});

test('`setupPlugins` throws if plugins have circular required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { required: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { required: ['depends-on-1'] }));

  await expect(pluginsSystem.setupPlugins(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["depends-on-1","depends-on-2"]]`
  );
});

test('`setupPlugins` throws if plugins have circular optional dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { optional: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { optional: ['depends-on-1'] }));

  await expect(pluginsSystem.setupPlugins(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["depends-on-1","depends-on-2"]]`
  );
});

test('`setupPlugins` ignores missing optional dependency', async () => {
  const plugin = createPlugin('some-id', { optional: ['missing-dep'] });
  jest.spyOn(plugin, 'setup').mockResolvedValue('test');

  pluginsSystem.addPlugin(plugin);

  expect([...(await pluginsSystem.setupPlugins(setupDeps))]).toMatchInlineSnapshot(`
    Array [
      Array [
        "some-id",
        "test",
      ],
    ]
  `);
});

test('`setupPlugins` setups the runtimeResolver', async () => {
  const pluginA = createPlugin('pluginA', { required: [] });
  const pluginB = createPlugin('pluginB', { required: ['pluginA'] });

  jest.spyOn(pluginA, 'setup').mockReturnValue('contractA');
  jest.spyOn(pluginB, 'setup').mockReturnValue('contractB');

  pluginsSystem.addPlugin(pluginA);
  pluginsSystem.addPlugin(pluginB);

  await pluginsSystem.setupPlugins(setupDeps);

  expect(runtimeResolverMock.setDependencyMap).toHaveBeenCalledTimes(1);
  expect(runtimeResolverMock.setDependencyMap).toHaveBeenCalledWith(expect.any(Map));

  expect(runtimeResolverMock.resolveSetupRequests).toHaveBeenCalledTimes(1);
  expect(runtimeResolverMock.resolveSetupRequests).toHaveBeenCalledWith(expect.any(Map));
  expect(
    Object.fromEntries([...runtimeResolverMock.resolveSetupRequests.mock.calls[0][0].entries()])
  ).toEqual({
    pluginA: 'contractA',
    pluginB: 'contractB',
  });
});

test('correctly orders plugins and returns exposed values for "setup" and "start"', async () => {
  interface Contracts {
    setup: Record<PluginName, unknown>;
    start: Record<PluginName, unknown>;
  }

  const plugins = new Map([
    [
      createPlugin('order-4', { required: ['order-2'] }),
      {
        setup: { 'order-2': 'added-as-2' },
        start: { 'order-2': 'started-as-2' },
      },
    ],
    [
      createPlugin('order-0'),
      {
        setup: {},
        start: {},
      },
    ],
    [
      createPlugin('order-2', { required: ['order-1'], optional: ['order-0'] }),
      {
        setup: { 'order-1': 'added-as-3', 'order-0': 'added-as-1' },
        start: { 'order-1': 'started-as-3', 'order-0': 'started-as-1' },
      },
    ],
    [
      createPlugin('order-1', { required: ['order-0'] }),
      {
        setup: { 'order-0': 'added-as-1' },
        start: { 'order-0': 'started-as-1' },
      },
    ],
    [
      createPlugin('order-3', { required: ['order-2'], optional: ['missing-dep'] }),
      {
        setup: { 'order-2': 'added-as-2' },
        start: { 'order-2': 'started-as-2' },
      },
    ],
  ] as Array<[PluginWrapper<any, any>, Contracts]>);

  const setupContextMap = new Map();
  const startContextMap = new Map();

  [...plugins.keys()].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`added-as-${index}`);
    jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);

    setupContextMap.set(plugin.name, `setup-for-${plugin.name}`);
    startContextMap.set(plugin.name, `start-for-${plugin.name}`);

    pluginsSystem.addPlugin(plugin);
  });

  mockCreatePluginSetupContext.mockImplementation(({ plugin }) => setupContextMap.get(plugin.name));

  mockCreatePluginStartContext.mockImplementation(({ plugin }) => startContextMap.get(plugin.name));

  expect([...(await pluginsSystem.setupPlugins(setupDeps))]).toMatchInlineSnapshot(`
    Array [
      Array [
        "order-0",
        "added-as-1",
      ],
      Array [
        "order-1",
        "added-as-3",
      ],
      Array [
        "order-2",
        "added-as-2",
      ],
      Array [
        "order-3",
        "added-as-4",
      ],
      Array [
        "order-4",
        "added-as-0",
      ],
    ]
  `);

  for (const [plugin, deps] of plugins) {
    expect(mockCreatePluginSetupContext).toHaveBeenCalledWith({
      deps: setupDeps,
      plugin,
      runtimeResolver: expect.any(Object),
    });
    expect(plugin.setup).toHaveBeenCalledTimes(1);
    expect(plugin.setup).toHaveBeenCalledWith(setupContextMap.get(plugin.name), deps.setup);
  }

  expect([...(await pluginsSystem.startPlugins(startDeps))]).toMatchInlineSnapshot(`
    Array [
      Array [
        "order-0",
        "started-as-1",
      ],
      Array [
        "order-1",
        "started-as-3",
      ],
      Array [
        "order-2",
        "started-as-2",
      ],
      Array [
        "order-3",
        "started-as-4",
      ],
      Array [
        "order-4",
        "started-as-0",
      ],
    ]
  `);

  for (const [plugin, deps] of plugins) {
    expect(mockCreatePluginStartContext).toHaveBeenCalledWith({
      deps: startDeps,
      plugin,
      runtimeResolver: expect.any(Object),
    });
    expect(plugin.start).toHaveBeenCalledTimes(1);
    expect(plugin.start).toHaveBeenCalledWith(startContextMap.get(plugin.name), deps.start);
  }
});

test('correctly orders preboot plugins and returns exposed values for "setup"', async () => {
  const prebootPluginSystem = new PluginsSystem(coreContext, PluginType.preboot);
  const plugins = new Map([
    [
      createPlugin('order-4', { type: PluginType.preboot, required: ['order-2'] }),
      { 'order-2': 'added-as-2' },
    ],
    [createPlugin('order-0', { type: PluginType.preboot }), {}],
    [
      createPlugin('order-2', {
        type: PluginType.preboot,
        required: ['order-1'],
        optional: ['order-0'],
      }),
      { 'order-1': 'added-as-3', 'order-0': 'added-as-1' },
    ],
    [
      createPlugin('order-1', { type: PluginType.preboot, required: ['order-0'] }),
      { 'order-0': 'added-as-1' },
    ],
    [
      createPlugin('order-3', {
        type: PluginType.preboot,
        required: ['order-2'],
        optional: ['missing-dep'],
      }),
      { 'order-2': 'added-as-2' },
    ],
  ] as Array<[PluginWrapper<any, any>, Record<PluginName, unknown>]>);

  const setupContextMap = new Map();
  [...plugins.keys()].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`added-as-${index}`);
    setupContextMap.set(plugin.name, `setup-for-${plugin.name}`);
    prebootPluginSystem.addPlugin(plugin);
  });

  mockCreatePluginPrebootSetupContext.mockImplementation(({ plugin }) =>
    setupContextMap.get(plugin.name)
  );

  expect([...(await prebootPluginSystem.setupPlugins(prebootDeps))]).toMatchInlineSnapshot(`
    Array [
      Array [
        "order-0",
        "added-as-1",
      ],
      Array [
        "order-1",
        "added-as-3",
      ],
      Array [
        "order-2",
        "added-as-2",
      ],
      Array [
        "order-3",
        "added-as-4",
      ],
      Array [
        "order-4",
        "added-as-0",
      ],
    ]
  `);

  for (const [plugin, deps] of plugins) {
    expect(mockCreatePluginPrebootSetupContext).toHaveBeenCalledWith({
      deps: prebootDeps,
      plugin,
    });
    expect(plugin.setup).toHaveBeenCalledTimes(1);
    expect(plugin.setup).toHaveBeenCalledWith(setupContextMap.get(plugin.name), deps);
  }
});

test('`setupPlugins` only setups plugins that have server side', async () => {
  const firstPluginToRun = createPlugin('order-0');
  const secondPluginNotToRun = createPlugin('order-not-run', { server: false });
  const thirdPluginToRun = createPlugin('order-1');

  [firstPluginToRun, secondPluginNotToRun, thirdPluginToRun].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`added-as-${index}`);

    pluginsSystem.addPlugin(plugin);
  });

  expect([...(await pluginsSystem.setupPlugins(setupDeps))]).toMatchInlineSnapshot(`
    Array [
      Array [
        "order-1",
        "added-as-2",
      ],
      Array [
        "order-0",
        "added-as-0",
      ],
    ]
  `);

  expect(mockCreatePluginSetupContext).toHaveBeenCalledWith({
    deps: setupDeps,
    plugin: firstPluginToRun,
    runtimeResolver: expect.any(Object),
  });
  expect(mockCreatePluginSetupContext).not.toHaveBeenCalledWith({
    deps: setupDeps,
    plugin: secondPluginNotToRun,
    runtimeResolver: expect.any(Object),
  });
  expect(mockCreatePluginSetupContext).toHaveBeenCalledWith({
    deps: setupDeps,
    plugin: thirdPluginToRun,
    runtimeResolver: expect.any(Object),
  });

  expect(firstPluginToRun.setup).toHaveBeenCalledTimes(1);
  expect(secondPluginNotToRun.setup).not.toHaveBeenCalled();
  expect(thirdPluginToRun.setup).toHaveBeenCalledTimes(1);
});

test('`uiPlugins` returns empty Map before plugins are added', async () => {
  expect(pluginsSystem.uiPlugins()).toMatchInlineSnapshot(`Map {}`);
});

test('`uiPlugins` returns ordered Maps of all plugin manifests', async () => {
  const plugins = new Map([
    [createPlugin('order-4', { required: ['order-2'] }), { 'order-2': 'added-as-2' }],
    [createPlugin('order-0'), {}],
    [
      createPlugin('order-2', { required: ['order-1'], optional: ['order-0'] }),
      { 'order-1': 'added-as-3', 'order-0': 'added-as-1' },
    ],
    [createPlugin('order-1', { required: ['order-0'] }), { 'order-0': 'added-as-1' }],
    [
      createPlugin('order-3', { required: ['order-2'], optional: ['missing-dep'] }),
      { 'order-2': 'added-as-2' },
    ],
  ] as Array<[PluginWrapper, Record<PluginName, unknown>]>);

  [...plugins.keys()].forEach((plugin) => {
    pluginsSystem.addPlugin(plugin);
  });

  expect([...pluginsSystem.uiPlugins().keys()]).toMatchInlineSnapshot(`
    Array [
      "order-0",
      "order-1",
      "order-2",
      "order-3",
      "order-4",
    ]
  `);
});

test('`uiPlugins` returns only ui plugin dependencies', async () => {
  const plugins = [
    createPlugin('ui-plugin', {
      required: ['req-ui', 'req-no-ui'],
      optional: ['opt-ui', 'opt-no-ui'],
      ui: true,
      server: false,
    }),
    createPlugin('req-ui', { ui: true, server: false }),
    createPlugin('req-no-ui', { ui: false, server: true }),
    createPlugin('opt-ui', { ui: true, server: false }),
    createPlugin('opt-no-ui', { ui: false, server: true }),
  ];

  plugins.forEach((plugin) => {
    pluginsSystem.addPlugin(plugin);
  });

  const plugin = pluginsSystem.uiPlugins().get('ui-plugin')!;
  expect(plugin.requiredPlugins).toEqual(['req-ui']);
  expect(plugin.optionalPlugins).toEqual(['opt-ui']);
});

test('can start without plugins', async () => {
  await pluginsSystem.setupPlugins(setupDeps);
  const pluginsStart = await pluginsSystem.startPlugins(startDeps);

  expect(pluginsStart).toBeInstanceOf(Map);
  expect(pluginsStart.size).toBe(0);
});

test('cannot start preboot plugins', async () => {
  const prebootPlugin = createPlugin('order-0', { type: PluginType.preboot });
  jest.spyOn(prebootPlugin, 'setup').mockResolvedValue({});
  jest.spyOn(prebootPlugin, 'start').mockResolvedValue({});

  const prebootPluginSystem = new PluginsSystem(coreContext, PluginType.preboot);
  prebootPluginSystem.addPlugin(prebootPlugin);
  await prebootPluginSystem.setupPlugins(prebootDeps);

  await expect(
    prebootPluginSystem.startPlugins(startDeps)
  ).rejects.toThrowErrorMatchingInlineSnapshot(`"Preboot plugins cannot be started."`);
  expect(prebootPlugin.start).not.toHaveBeenCalled();
});

test('`startPlugins` only starts plugins that were setup', async () => {
  const firstPluginToRun = createPlugin('order-0');
  const secondPluginNotToRun = createPlugin('order-not-run', { server: false });
  const thirdPluginToRun = createPlugin('order-1');

  [firstPluginToRun, secondPluginNotToRun, thirdPluginToRun].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
    jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);

    pluginsSystem.addPlugin(plugin);
  });
  await pluginsSystem.setupPlugins(setupDeps);
  const result = await pluginsSystem.startPlugins(startDeps);
  expect([...result]).toMatchInlineSnapshot(`
    Array [
      Array [
        "order-1",
        "started-as-2",
      ],
      Array [
        "order-0",
        "started-as-0",
      ],
    ]
  `);
});

describe('setup', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  it('throws timeout error if "setup" was not completed in 10 sec.', async () => {
    const plugin: PluginWrapper = createPlugin('timeout-setup');
    jest.spyOn(plugin, 'setup').mockImplementation(() => new Promise((i) => i));
    pluginsSystem.addPlugin(plugin);
    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    const promise = pluginsSystem.setupPlugins(setupDeps);
    process.nextTick(() => {
      // let the await init go through. then simulate the timeout
      jest.runAllTimers();
    });

    await expect(promise).rejects.toMatchInlineSnapshot(
      `[Error: Setup lifecycle of "timeout-setup" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.]`
    );
  });

  it('logs only server-side plugins', async () => {
    [
      createPlugin('order-0'),
      createPlugin('order-not-run', { server: false }),
      createPlugin('order-1'),
    ].forEach((plugin, index) => {
      jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
      jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
      pluginsSystem.addPlugin(plugin);
    });
    await pluginsSystem.setupPlugins(setupDeps);
    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.info).toHaveBeenCalledWith(`Setting up [2] plugins: [order-1,order-0]`);
  });
});

describe('start', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  it('throws timeout error if "start" was not completed in 10 sec.', async () => {
    const plugin = createPlugin('timeout-start');
    jest.spyOn(plugin, 'setup').mockResolvedValue({});
    jest.spyOn(plugin, 'start').mockImplementation(() => new Promise((i) => i));

    pluginsSystem.addPlugin(plugin);
    mockCreatePluginSetupContext.mockImplementation(() => ({}));
    mockCreatePluginStartContext.mockImplementation(() => ({}));

    await pluginsSystem.setupPlugins(setupDeps);
    const promise = pluginsSystem.startPlugins(startDeps);
    jest.runAllTimers();

    await expect(promise).rejects.toMatchInlineSnapshot(
      `[Error: Start lifecycle of "timeout-start" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.]`
    );
  });

  it('logs only server-side plugins', async () => {
    [
      createPlugin('order-0'),
      createPlugin('order-not-run', { server: false }),
      createPlugin('order-1'),
    ].forEach((plugin, index) => {
      jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
      jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
      pluginsSystem.addPlugin(plugin);
    });
    await pluginsSystem.setupPlugins(setupDeps);
    await pluginsSystem.startPlugins(startDeps);
    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.info).toHaveBeenCalledWith(`Starting [2] plugins: [order-1,order-0]`);
  });

  it('setups the runtimeResolver', async () => {
    const pluginA = createPlugin('pluginA', { required: [] });
    const pluginB = createPlugin('pluginB', { required: ['pluginA'] });

    jest.spyOn(pluginA, 'setup').mockReturnValue({});
    jest.spyOn(pluginB, 'setup').mockReturnValue({});

    jest.spyOn(pluginA, 'start').mockReturnValue('contractA');
    jest.spyOn(pluginB, 'start').mockReturnValue('contractB');

    pluginsSystem.addPlugin(pluginA);
    pluginsSystem.addPlugin(pluginB);

    await pluginsSystem.setupPlugins(setupDeps);
    await pluginsSystem.startPlugins(startDeps);

    expect(runtimeResolverMock.resolveStartRequests).toHaveBeenCalledTimes(1);
    expect(runtimeResolverMock.resolveStartRequests).toHaveBeenCalledWith(expect.any(Map));
    expect(
      Object.fromEntries([...runtimeResolverMock.resolveStartRequests.mock.calls[0][0].entries()])
    ).toEqual({
      pluginA: 'contractA',
      pluginB: 'contractB',
    });
  });
});

describe('asynchronous plugins', () => {
  const runScenario = async ({
    production,
    asyncSetup,
    asyncStart,
  }: {
    production: boolean;
    asyncSetup: boolean;
    asyncStart: boolean;
  }) => {
    env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        cliArgs: {
          dev: !production,
          envName: production ? 'production' : 'development',
        },
      })
    );
    coreContext = { coreId: Symbol(), env, logger, configService: configService as any };
    pluginsSystem = new PluginsSystem(coreContext, PluginType.standard);

    const syncPlugin = createPlugin('sync-plugin');
    jest.spyOn(syncPlugin, 'setup').mockReturnValue('setup-sync');
    jest.spyOn(syncPlugin, 'start').mockReturnValue('start-sync');
    pluginsSystem.addPlugin(syncPlugin);

    const asyncPlugin = createPlugin('async-plugin');
    jest
      .spyOn(asyncPlugin, 'setup')
      .mockReturnValue(asyncSetup ? Promise.resolve('setup-async') : 'setup-sync');
    jest
      .spyOn(asyncPlugin, 'start')
      .mockReturnValue(asyncStart ? Promise.resolve('start-async') : 'start-sync');
    pluginsSystem.addPlugin(asyncPlugin);

    await pluginsSystem.setupPlugins(setupDeps);
    await pluginsSystem.startPlugins(startDeps);
  };

  it('logs a warning if a plugin returns a promise from its setup contract in dev mode', async () => {
    await runScenario({
      production: false,
      asyncSetup: true,
      asyncStart: false,
    });

    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Plugin async-plugin is using asynchronous setup lifecycle. Asynchronous plugins support will be removed in a later version.",
        ],
      ]
    `);
  });

  it('does not log warnings if a plugin returns a promise from its setup contract in prod mode', async () => {
    await runScenario({
      production: true,
      asyncSetup: true,
      asyncStart: false,
    });

    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('logs a warning if a plugin returns a promise from its start contract in dev mode', async () => {
    await runScenario({
      production: false,
      asyncSetup: false,
      asyncStart: true,
    });

    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Plugin async-plugin is using asynchronous start lifecycle. Asynchronous plugins support will be removed in a later version.",
        ],
      ]
    `);
  });

  it('does not log warnings if a plugin returns a promise from its start contract  in prod mode', async () => {
    await runScenario({
      production: true,
      asyncSetup: false,
      asyncStart: true,
    });

    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('logs multiple warnings if both `setup` and `start` return promises', async () => {
    await runScenario({
      production: false,
      asyncSetup: true,
      asyncStart: true,
    });

    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Plugin async-plugin is using asynchronous setup lifecycle. Asynchronous plugins support will be removed in a later version.",
        ],
        Array [
          "Plugin async-plugin is using asynchronous start lifecycle. Asynchronous plugins support will be removed in a later version.",
        ],
      ]
    `);
  });
});

describe('stop', () => {
  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const nextTick = () => new Promise((resolve) => setImmediate(resolve));

  it('stops all plugins', async () => {
    const [plugin1, plugin2, plugin3] = [
      createPlugin('plugin-1'),
      createPlugin('plugin-2'),
      createPlugin('plugin-3'),
    ].map((plugin, index) => {
      jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
      jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
      pluginsSystem.addPlugin(plugin);
      return plugin;
    });

    const stopSpy1 = jest.spyOn(plugin1, 'stop').mockImplementationOnce(() => Promise.resolve());
    const stopSpy2 = jest.spyOn(plugin2, 'stop').mockImplementationOnce(() => Promise.resolve());
    const stopSpy3 = jest.spyOn(plugin3, 'stop').mockImplementationOnce(() => Promise.resolve());

    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    await pluginsSystem.setupPlugins(setupDeps);
    const stopPromise = pluginsSystem.stopPlugins();

    await nextTick();
    jest.runAllTimers();

    await stopPromise;

    expect(stopSpy1).toHaveBeenCalledTimes(1);
    expect(stopSpy2).toHaveBeenCalledTimes(1);
    expect(stopSpy3).toHaveBeenCalledTimes(1);
  });

  it('stops plugins in the correct order', async () => {
    // stop order: 3 => 1 => 2
    const [plugin1, plugin2, plugin3] = [
      createPlugin('plugin-1', { required: ['plugin-2'] }),
      createPlugin('plugin-2'),
      createPlugin('plugin-3', { required: ['plugin-1', 'plugin-2'] }),
    ].map((plugin, index) => {
      jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
      jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
      pluginsSystem.addPlugin(plugin);
      return plugin;
    });

    const stopSpy1 = jest.spyOn(plugin1, 'stop').mockImplementationOnce(() => Promise.resolve());
    const stopSpy2 = jest.spyOn(plugin2, 'stop').mockImplementationOnce(() => Promise.resolve());
    const stopSpy3 = jest.spyOn(plugin3, 'stop').mockImplementationOnce(() => Promise.resolve());

    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    await pluginsSystem.setupPlugins(setupDeps);
    const stopPromise = pluginsSystem.stopPlugins();

    await nextTick();
    jest.runAllTimers();

    await stopPromise;

    expect(stopSpy3.mock.invocationCallOrder[0]).toBeLessThan(stopSpy1.mock.invocationCallOrder[0]);
    expect(stopSpy1.mock.invocationCallOrder[0]).toBeLessThan(stopSpy2.mock.invocationCallOrder[0]);
  });

  it('waits for 15 sec to finish "stop" and move on to the next plugin.', async () => {
    const [plugin1, plugin2] = [createPlugin('timeout-stop-1'), createPlugin('timeout-stop-2')].map(
      (plugin, index) => {
        jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
        jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
        pluginsSystem.addPlugin(plugin);
        return plugin;
      }
    );

    const stopSpy1 = jest
      .spyOn(plugin1, 'stop')
      .mockImplementationOnce(() => new Promise((resolve) => resolve));
    const stopSpy2 = jest.spyOn(plugin2, 'stop').mockImplementationOnce(() => Promise.resolve());

    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    await pluginsSystem.setupPlugins(setupDeps);
    const stopPromise = pluginsSystem.stopPlugins();

    await nextTick();
    jest.runAllTimers();

    await stopPromise;

    expect(stopSpy1).toHaveBeenCalledTimes(1);
    expect(stopSpy2).toHaveBeenCalledTimes(1);

    expect(loggingSystemMock.collect(logger).warn.flat()).toEqual(
      expect.arrayContaining([
        `"timeout-stop-1" plugin didn't stop in 15sec., move on to the next.`,
      ])
    );
  });

  it('logs a message if a plugin fails top stop', async () => {
    // stop order: 3 => 1 => 2
    const [plugin1, plugin2, plugin3] = [
      createPlugin('plugin-1', { required: ['plugin-2'] }),
      createPlugin('plugin-2'),
      createPlugin('plugin-3', { required: ['plugin-1', 'plugin-2'] }),
    ].map((plugin, index) => {
      jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
      jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
      pluginsSystem.addPlugin(plugin);
      return plugin;
    });

    const stopSpy1 = jest
      .spyOn(plugin1, 'stop')
      .mockImplementationOnce(() => Promise.reject('woups'));
    const stopSpy2 = jest.spyOn(plugin2, 'stop').mockImplementationOnce(() => Promise.resolve());
    const stopSpy3 = jest.spyOn(plugin3, 'stop').mockImplementationOnce(() => Promise.resolve());

    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    await pluginsSystem.setupPlugins(setupDeps);
    const stopPromise = pluginsSystem.stopPlugins();

    await nextTick();
    jest.runAllTimers();

    await stopPromise;

    expect(stopSpy1).toHaveBeenCalledTimes(1);
    expect(stopSpy2).toHaveBeenCalledTimes(1);
    expect(stopSpy3).toHaveBeenCalledTimes(1);

    expect(loggingSystemMock.collect(logger).warn.flat()).toEqual(
      expect.arrayContaining([`"plugin-1" thrown during stop: woups`])
    );
  });
});
