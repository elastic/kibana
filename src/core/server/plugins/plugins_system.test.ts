/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  mockCreatePluginPrebootSetupContext,
  mockCreatePluginSetupContext,
  mockCreatePluginStartContext,
} from './plugins_system.test.mocks';

import { BehaviorSubject } from 'rxjs';

import { REPO_ROOT } from '@kbn/dev-utils';
import { Env } from '../config';
import { configServiceMock, getEnvOptions } from '../config/mocks';
import { CoreContext } from '../core_context';
import { loggingSystemMock } from '../logging/logging_system.mock';

import { PluginWrapper } from './plugin';
import { PluginName, PluginType } from './types';
import { PluginsSystem } from './plugins_system';
import { coreMock } from '../mocks';
import { Logger } from '../logging';

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
  return new PluginWrapper<any, any>({
    path: 'some-path',
    manifest: {
      id,
      version: 'some-version',
      configPath: 'path',
      kibanaVersion: '7.0.0',
      type,
      requiredPlugins: required,
      optionalPlugins: optional,
      requiredBundles: [],
      server,
      ui,
    },
    opaqueId: Symbol(id),
    initializerContext: { logger } as any,
  });
}

const prebootDeps = coreMock.createInternalPreboot();
const setupDeps = coreMock.createInternalSetup();
const startDeps = coreMock.createInternalStart();

let pluginsSystem: PluginsSystem;
let configService: ReturnType<typeof configServiceMock.create>;
let logger: ReturnType<typeof loggingSystemMock.create>;
let env: Env;
let coreContext: CoreContext;

beforeEach(() => {
  logger = loggingSystemMock.create();
  env = Env.createDefault(REPO_ROOT, getEnvOptions());

  configService = configServiceMock.create();
  configService.atPath.mockReturnValue(new BehaviorSubject({ initialize: true }));

  coreContext = { coreId: Symbol(), env, logger, configService: configService as any };

  pluginsSystem = new PluginsSystem(coreContext);
});

test('can be setup even without plugins', async () => {
  for (const pluginsSetup of [
    await pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps),
    await pluginsSystem.setupPlugins(PluginType.standard, setupDeps),
  ]) {
    expect(pluginsSetup).toBeInstanceOf(Map);
    expect(pluginsSetup.size).toBe(0);
  }
});

test('getPlugins returns the list of plugins', () => {
  const pluginA = createPlugin('plugin-a', { type: PluginType.preboot });
  const pluginB = createPlugin('plugin-b', { type: PluginType.preboot });
  const pluginC = createPlugin('plugin-c');
  const pluginD = createPlugin('plugin-d');

  for (const plugin of [pluginA, pluginB, pluginC, pluginD]) {
    pluginsSystem.addPlugin(plugin);
  }

  expect(pluginsSystem.getPlugins(PluginType.preboot)).toEqual([pluginA, pluginB]);
  expect(pluginsSystem.getPlugins(PluginType.standard)).toEqual([pluginC, pluginD]);
});

test('getPluginDependencies returns dependency tree of symbols', () => {
  for (const type of [PluginType.preboot, PluginType.standard]) {
    pluginsSystem.addPlugin(
      createPlugin(`plugin-a-${type}`, { type, required: [`no-dep-${type}`] })
    );
    pluginsSystem.addPlugin(
      createPlugin(`plugin-b-${type}`, {
        type,
        required: [`plugin-a-${type}`],
        optional: [`no-dep-${type}`, `other-${type}`],
      })
    );
    pluginsSystem.addPlugin(createPlugin(`no-dep-${type}`, { type }));
  }

  expect(pluginsSystem.getPluginDependencies(PluginType.preboot)).toMatchInlineSnapshot(`
    Object {
      "asNames": Map {
        "plugin-a-preboot" => Array [
          "no-dep-preboot",
        ],
        "plugin-b-preboot" => Array [
          "plugin-a-preboot",
          "no-dep-preboot",
        ],
        "no-dep-preboot" => Array [],
      },
      "asOpaqueIds": Map {
        Symbol(plugin-a-preboot) => Array [
          Symbol(no-dep-preboot),
        ],
        Symbol(plugin-b-preboot) => Array [
          Symbol(plugin-a-preboot),
          Symbol(no-dep-preboot),
        ],
        Symbol(no-dep-preboot) => Array [],
      },
    }
  `);
  expect(pluginsSystem.getPluginDependencies(PluginType.standard)).toMatchInlineSnapshot(`
    Object {
      "asNames": Map {
        "plugin-a-standard" => Array [
          "no-dep-standard",
        ],
        "plugin-b-standard" => Array [
          "plugin-a-standard",
          "no-dep-standard",
        ],
        "no-dep-standard" => Array [],
      },
      "asOpaqueIds": Map {
        Symbol(plugin-a-standard) => Array [
          Symbol(no-dep-standard),
        ],
        Symbol(plugin-b-standard) => Array [
          Symbol(plugin-a-standard),
          Symbol(no-dep-standard),
        ],
        Symbol(no-dep-standard) => Array [],
      },
    }
  `);
});

test('`setupPlugins` throws plugin has missing required dependency', async () => {
  pluginsSystem.addPlugin(
    createPlugin('some-id-preboot', { type: PluginType.preboot, required: ['missing-dep'] })
  );
  await expect(
    pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["some-id-preboot"]]`
  );

  pluginsSystem.addPlugin(createPlugin('some-id', { required: ['missing-dep'] }));
  await expect(
    pluginsSystem.setupPlugins(PluginType.standard, setupDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["some-id"]]`
  );
});

test('`setupPlugins` throws plugin has incompatible required dependency', async () => {
  pluginsSystem.addPlugin(
    createPlugin('some-id-preboot', {
      type: PluginType.preboot,
      required: ['incompatible-standard'],
    })
  );
  pluginsSystem.addPlugin(createPlugin('incompatible-standard'));
  await expect(
    pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["some-id-preboot"]]`
  );

  pluginsSystem.addPlugin(createPlugin('some-id', { required: ['incompatible-preboot'] }));
  pluginsSystem.addPlugin(createPlugin('incompatible-preboot', { type: PluginType.preboot }));
  await expect(
    pluginsSystem.setupPlugins(PluginType.standard, setupDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["some-id"]]`
  );
});

test('`setupPlugins` throws if plugins have circular required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep-preboot', { type: PluginType.preboot }));
  pluginsSystem.addPlugin(
    createPlugin('depends-on-1-preboot', {
      type: PluginType.preboot,
      required: ['depends-on-2-preboot'],
    })
  );
  pluginsSystem.addPlugin(
    createPlugin('depends-on-2-preboot', {
      type: PluginType.preboot,
      required: ['depends-on-1-preboot'],
    })
  );

  await expect(
    pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["depends-on-1-preboot","depends-on-2-preboot"]]`
  );

  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { required: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { required: ['depends-on-1'] }));

  await expect(
    pluginsSystem.setupPlugins(PluginType.standard, setupDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["depends-on-1","depends-on-2"]]`
  );
});

test('`setupPlugins` throws if plugins have circular optional dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep-preboot', { type: PluginType.preboot }));
  pluginsSystem.addPlugin(
    createPlugin('depends-on-1-preboot', {
      type: PluginType.preboot,
      optional: ['depends-on-2-preboot'],
    })
  );
  pluginsSystem.addPlugin(
    createPlugin('depends-on-2-preboot', {
      type: PluginType.preboot,
      optional: ['depends-on-1-preboot'],
    })
  );

  await expect(
    pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["depends-on-1-preboot","depends-on-2-preboot"]]`
  );

  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { optional: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { optional: ['depends-on-1'] }));

  await expect(
    pluginsSystem.setupPlugins(PluginType.standard, setupDeps)
  ).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these plugins have cyclic or missing dependencies: ["depends-on-1","depends-on-2"]]`
  );
});

test('`setupPlugins` ignores missing optional dependency', async () => {
  const prebootPlugin = createPlugin('some-id-preboot', {
    type: PluginType.preboot,
    optional: ['missing-dep'],
  });
  jest.spyOn(prebootPlugin, 'setup').mockResolvedValue('test');

  pluginsSystem.addPlugin(prebootPlugin);

  expect([...(await pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps))])
    .toMatchInlineSnapshot(`
    Array [
      Array [
        "some-id-preboot",
        "test",
      ],
    ]
  `);

  const plugin = createPlugin('some-id', { optional: ['missing-dep'] });
  jest.spyOn(plugin, 'setup').mockResolvedValue('test');

  pluginsSystem.addPlugin(plugin);

  expect([...(await pluginsSystem.setupPlugins(PluginType.standard, setupDeps))])
    .toMatchInlineSnapshot(`
    Array [
      Array [
        "some-id",
        "test",
      ],
    ]
  `);
});

test('correctly orders preboot plugins and returns exposed values for "setup"', async () => {
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
    pluginsSystem.addPlugin(plugin);
  });

  mockCreatePluginPrebootSetupContext.mockImplementation((context, deps, plugin) =>
    setupContextMap.get(plugin.name)
  );

  expect([...(await pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps))])
    .toMatchInlineSnapshot(`
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
    expect(mockCreatePluginPrebootSetupContext).toHaveBeenCalledWith(
      coreContext,
      prebootDeps,
      plugin
    );
    expect(plugin.setup).toHaveBeenCalledTimes(1);
    expect(plugin.setup).toHaveBeenCalledWith(setupContextMap.get(plugin.name), deps);
  }
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

  mockCreatePluginSetupContext.mockImplementation((context, deps, plugin) =>
    setupContextMap.get(plugin.name)
  );

  mockCreatePluginStartContext.mockImplementation((context, deps, plugin) =>
    startContextMap.get(plugin.name)
  );

  expect([...(await pluginsSystem.setupPlugins(PluginType.standard, setupDeps))])
    .toMatchInlineSnapshot(`
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
    expect(mockCreatePluginSetupContext).toHaveBeenCalledWith(coreContext, setupDeps, plugin);
    expect(plugin.setup).toHaveBeenCalledTimes(1);
    expect(plugin.setup).toHaveBeenCalledWith(setupContextMap.get(plugin.name), deps.setup);
  }

  expect([...(await pluginsSystem.startPlugins(PluginType.standard, startDeps))])
    .toMatchInlineSnapshot(`
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
    expect(mockCreatePluginStartContext).toHaveBeenCalledWith(coreContext, startDeps, plugin);
    expect(plugin.start).toHaveBeenCalledTimes(1);
    expect(plugin.start).toHaveBeenCalledWith(startContextMap.get(plugin.name), deps.start);
  }
});

test('`setupPlugins` only setups preboot plugins that have server side', async () => {
  const firstPluginToRun = createPlugin('order-0', { type: PluginType.preboot });
  const secondPluginNotToRun = createPlugin('order-not-run', {
    type: PluginType.preboot,
    server: false,
  });
  const thirdPluginToRun = createPlugin('order-1', { type: PluginType.preboot });

  [firstPluginToRun, secondPluginNotToRun, thirdPluginToRun].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`added-as-${index}`);

    pluginsSystem.addPlugin(plugin);
  });

  expect([...(await pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps))])
    .toMatchInlineSnapshot(`
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

  expect(mockCreatePluginPrebootSetupContext).toHaveBeenCalledWith(
    coreContext,
    prebootDeps,
    firstPluginToRun
  );
  expect(mockCreatePluginPrebootSetupContext).not.toHaveBeenCalledWith(
    coreContext,
    secondPluginNotToRun
  );
  expect(mockCreatePluginPrebootSetupContext).toHaveBeenCalledWith(
    coreContext,
    prebootDeps,
    thirdPluginToRun
  );

  expect(firstPluginToRun.setup).toHaveBeenCalledTimes(1);
  expect(secondPluginNotToRun.setup).not.toHaveBeenCalled();
  expect(thirdPluginToRun.setup).toHaveBeenCalledTimes(1);
});

test('`setupPlugins` only setups plugins that have server side', async () => {
  const firstPluginToRun = createPlugin('order-0');
  const secondPluginNotToRun = createPlugin('order-not-run', { server: false });
  const thirdPluginToRun = createPlugin('order-1');

  [firstPluginToRun, secondPluginNotToRun, thirdPluginToRun].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`added-as-${index}`);

    pluginsSystem.addPlugin(plugin);
  });

  expect([...(await pluginsSystem.setupPlugins(PluginType.standard, setupDeps))])
    .toMatchInlineSnapshot(`
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

  expect(mockCreatePluginSetupContext).toHaveBeenCalledWith(
    coreContext,
    setupDeps,
    firstPluginToRun
  );
  expect(mockCreatePluginSetupContext).not.toHaveBeenCalledWith(coreContext, secondPluginNotToRun);
  expect(mockCreatePluginSetupContext).toHaveBeenCalledWith(
    coreContext,
    setupDeps,
    thirdPluginToRun
  );

  expect(firstPluginToRun.setup).toHaveBeenCalledTimes(1);
  expect(secondPluginNotToRun.setup).not.toHaveBeenCalled();
  expect(thirdPluginToRun.setup).toHaveBeenCalledTimes(1);
});

test('`uiPlugins` returns empty Map before plugins are added', async () => {
  expect(pluginsSystem.uiPlugins(PluginType.preboot)).toMatchInlineSnapshot(`Map {}`);
  expect(pluginsSystem.uiPlugins(PluginType.standard)).toMatchInlineSnapshot(`Map {}`);
});

test('`uiPlugins` returns ordered Maps of all plugin manifests', async () => {
  const plugins = new Map(
    [PluginType.preboot, PluginType.standard].flatMap(
      (type) =>
        [
          [
            createPlugin(`order-4-${type}`, { type, required: [`order-2-${type}`] }),
            { 'order-2': 'added-as-2' },
          ],
          [createPlugin(`order-0-${type}`, { type }), {}],
          [
            createPlugin(`order-2-${type}`, {
              type,
              required: [`order-1-${type}`],
              optional: [`order-0-${type}`],
            }),
            { 'order-1': 'added-as-3', 'order-0': 'added-as-1' },
          ],
          [
            createPlugin(`order-1-${type}`, { type, required: [`order-0-${type}`] }),
            { 'order-0': 'added-as-1' },
          ],
          [
            createPlugin(`order-3-${type}`, {
              type,
              required: [`order-2-${type}`],
              optional: ['missing-dep'],
            }),
            { 'order-2': 'added-as-2' },
          ],
        ] as Array<[PluginWrapper, Record<PluginName, unknown>]>
    )
  );

  [...plugins.keys()].forEach((plugin) => {
    pluginsSystem.addPlugin(plugin);
  });

  expect([...pluginsSystem.uiPlugins(PluginType.preboot).keys()]).toMatchInlineSnapshot(`
    Array [
      "order-0-preboot",
      "order-1-preboot",
      "order-2-preboot",
      "order-3-preboot",
      "order-4-preboot",
    ]
  `);
  expect([...pluginsSystem.uiPlugins(PluginType.standard).keys()]).toMatchInlineSnapshot(`
    Array [
      "order-0-standard",
      "order-1-standard",
      "order-2-standard",
      "order-3-standard",
      "order-4-standard",
    ]
  `);
});

test('`uiPlugins` returns only ui plugin dependencies', async () => {
  const plugins = [PluginType.preboot, PluginType.standard].flatMap((type) => [
    createPlugin(`ui-plugin-${type}`, {
      type,
      required: [`req-ui-${type}`, `req-no-ui-${type}`],
      optional: [`opt-ui-${type}`, `opt-no-ui-${type}`],
      ui: true,
      server: false,
    }),
    createPlugin(`req-ui-${type}`, { type, ui: true, server: false }),
    createPlugin(`req-no-ui-${type}`, { type, ui: false, server: true }),
    createPlugin(`opt-ui-${type}`, { type, ui: true, server: false }),
    createPlugin(`opt-no-ui-${type}`, { type, ui: false, server: true }),
  ]);

  plugins.forEach((plugin) => {
    pluginsSystem.addPlugin(plugin);
  });

  for (const type of [PluginType.preboot, PluginType.standard]) {
    const plugin = pluginsSystem.uiPlugins(type).get(`ui-plugin-${type}`)!;
    expect(plugin.requiredPlugins).toEqual([`req-ui-${type}`]);
    expect(plugin.optionalPlugins).toEqual([`opt-ui-${type}`]);
  }
});

test('can start without standard plugins', async () => {
  await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
  const pluginsStart = await pluginsSystem.startPlugins(PluginType.standard, startDeps);

  expect(pluginsStart).toBeInstanceOf(Map);
  expect(pluginsStart.size).toBe(0);
});

test('`startPlugins` only starts standard plugins that were setup', async () => {
  const firstPluginToRun = createPlugin('order-0');
  const secondPluginNotToRun = createPlugin('order-not-run', { server: false });
  const thirdPluginToRun = createPlugin('order-1');

  [firstPluginToRun, secondPluginNotToRun, thirdPluginToRun].forEach((plugin, index) => {
    jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
    jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);

    pluginsSystem.addPlugin(plugin);
  });
  await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
  const result = await pluginsSystem.startPlugins(PluginType.standard, startDeps);
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
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  it('throws timeout error if "setup" was not completed in 10 sec.', async () => {
    const prebootPlugin: PluginWrapper = createPlugin('timeout-setup-preboot', {
      type: PluginType.preboot,
    });
    jest.spyOn(prebootPlugin, 'setup').mockImplementation(() => new Promise((i) => i));
    pluginsSystem.addPlugin(prebootPlugin);
    mockCreatePluginPrebootSetupContext.mockImplementation(() => ({}));

    const standardPlugin: PluginWrapper = createPlugin('timeout-setup');
    jest.spyOn(standardPlugin, 'setup').mockImplementation(() => new Promise((i) => i));
    pluginsSystem.addPlugin(standardPlugin);
    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    const prebootPromise = pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps);
    const standardPromise = pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
    jest.runAllTimers();

    await expect(prebootPromise).rejects.toMatchInlineSnapshot(
      `[Error: Setup lifecycle of "timeout-setup-preboot" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.]`
    );
    await expect(standardPromise).rejects.toMatchInlineSnapshot(
      `[Error: Setup lifecycle of "timeout-setup" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.]`
    );
  });

  it('logs only server-side plugins', async () => {
    [PluginType.preboot, PluginType.standard]
      .flatMap((type) => [
        createPlugin(`order-0-${type}`, { type }),
        createPlugin(`order-not-run-${type}`, { type, server: false }),
        createPlugin(`order-1-${type}`, { type }),
      ])
      .forEach((plugin, index) => {
        jest.spyOn(plugin, 'setup').mockResolvedValue(`setup-as-${index}`);
        jest.spyOn(plugin, 'start').mockResolvedValue(`started-as-${index}`);
        pluginsSystem.addPlugin(plugin);
      });
    await pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps);
    await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.info).toHaveBeenCalledWith(
      `Setting up [2] plugins: [order-1-preboot,order-0-preboot]`
    );
    expect(log.info).toHaveBeenCalledWith(
      `Setting up [2] plugins: [order-1-standard,order-0-standard]`
    );
  });
});

describe('start', () => {
  beforeAll(() => {
    jest.useFakeTimers();
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

    await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
    const promise = pluginsSystem.startPlugins(PluginType.standard, startDeps);
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
    await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
    await pluginsSystem.startPlugins(PluginType.standard, startDeps);
    const log = logger.get.mock.results[0].value as jest.Mocked<Logger>;
    expect(log.info).toHaveBeenCalledWith(`Starting [2] plugins: [order-1,order-0]`);
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
    pluginsSystem = new PluginsSystem(coreContext);

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

    await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);
    await pluginsSystem.startPlugins(PluginType.standard, startDeps);
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
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('waits for 30 sec to finish "stop" and move on to the next plugin.', async () => {
    const [prebootStopSpy1, prebootStopSpy2, standardStopSpy1, standardStopSpy2] = [
      PluginType.preboot,
      PluginType.standard,
    ].flatMap((type, index) => {
      const plugin1 = createPlugin(`timeout-stop-1-${type}`, { type });
      jest.spyOn(plugin1, 'setup').mockResolvedValue(`setup-as-${type}-${index}`);
      const stopSpy1 = jest
        .spyOn(plugin1, 'stop')
        .mockImplementationOnce(() => new Promise((resolve) => resolve));
      pluginsSystem.addPlugin(plugin1);

      const plugin2 = createPlugin(`timeout-stop-2-${type}`, { type });
      jest.spyOn(plugin2, 'setup').mockResolvedValue(`setup-as-${type}-${index}`);
      const stopSpy2 = jest.spyOn(plugin2, 'stop').mockImplementationOnce(() => Promise.resolve());
      pluginsSystem.addPlugin(plugin2);

      return [stopSpy1, stopSpy2];
    });

    mockCreatePluginPrebootSetupContext.mockImplementation(() => ({}));
    mockCreatePluginSetupContext.mockImplementation(() => ({}));

    await pluginsSystem.setupPlugins(PluginType.preboot, prebootDeps);
    await pluginsSystem.setupPlugins(PluginType.standard, setupDeps);

    const prebootStopPromise = pluginsSystem.stopPlugins(PluginType.preboot);
    jest.runAllTimers();
    await prebootStopPromise;
    expect(prebootStopSpy1).toHaveBeenCalledTimes(1);
    expect(prebootStopSpy2).toHaveBeenCalledTimes(1);

    const standardStopPromise = pluginsSystem.stopPlugins(PluginType.standard);
    jest.runAllTimers();
    await standardStopPromise;
    expect(standardStopSpy1).toHaveBeenCalledTimes(1);
    expect(standardStopSpy2).toHaveBeenCalledTimes(1);

    expect(loggingSystemMock.collect(logger).warn.flat()).toEqual(
      expect.arrayContaining([
        `"timeout-stop-1-preboot" plugin didn't stop in 30sec., move on to the next.`,
        `"timeout-stop-1-standard" plugin didn't stop in 30sec., move on to the next.`,
      ])
    );
  });
});
