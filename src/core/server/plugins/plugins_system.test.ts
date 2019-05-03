/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  mockCreatePluginSetupContext,
  mockCreatePluginStartContext,
} from './plugins_system.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { CoreContext } from '../core_context';
import { elasticsearchServiceMock } from '../elasticsearch/elasticsearch_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { PluginWrapper, PluginName } from './plugin';
import { PluginsSystem } from './plugins_system';

const logger = loggingServiceMock.create();
function createPlugin(
  id: string,
  {
    required = [],
    optional = [],
    server = true,
  }: { required?: string[]; optional?: string[]; server?: boolean } = {}
) {
  return new PluginWrapper(
    'some-path',
    {
      id,
      version: 'some-version',
      configPath: 'path',
      kibanaVersion: '7.0.0',
      requiredPlugins: required,
      optionalPlugins: optional,
      server,
      ui: true,
    },
    { logger } as any
  );
}

let pluginsSystem: PluginsSystem;
let configService: ConfigService;
let env: Env;
let coreContext: CoreContext;
const setupDeps = {
  elasticsearch: elasticsearchServiceMock.createSetupContract(),
  http: httpServiceMock.createSetupContract(),
};
beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  configService = new ConfigService(
    new BehaviorSubject<Config>(new ObjectToConfigAdapter({ plugins: { initialize: true } })),
    env,
    logger
  );

  coreContext = { env, logger, configService };

  pluginsSystem = new PluginsSystem(coreContext);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('can be setup even without plugins', async () => {
  const pluginsSetup = await pluginsSystem.setupPlugins(setupDeps);

  expect(pluginsSetup).toBeInstanceOf(Map);
  expect(pluginsSetup.size).toBe(0);
});

test('`setupPlugins` throws plugin has missing required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('some-id', { required: ['missing-dep'] }));

  await expect(pluginsSystem.setupPlugins(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these edges could not be ordered: [["some-id",{}]]]`
  );
});

test('`setupPlugins` throws if plugins have circular required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { required: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { required: ['depends-on-1'] }));

  await expect(pluginsSystem.setupPlugins(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these edges could not be ordered: [["depends-on-1",{}],["depends-on-2",{}]]]`
  );
});

test('`setupPlugins` throws if plugins have circular optional dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { optional: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { optional: ['depends-on-1'] }));

  await expect(pluginsSystem.setupPlugins(setupDeps)).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these edges could not be ordered: [["depends-on-1",{}],["depends-on-2",{}]]]`
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
  ] as Array<[PluginWrapper, Contracts]>);

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
    expect(mockCreatePluginSetupContext).toHaveBeenCalledWith(coreContext, setupDeps, plugin);
    expect(plugin.setup).toHaveBeenCalledTimes(1);
    expect(plugin.setup).toHaveBeenCalledWith(setupContextMap.get(plugin.name), deps.setup);
  }

  const startDeps = {};
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
    expect(mockCreatePluginStartContext).toHaveBeenCalledWith(coreContext, startDeps, plugin);
    expect(plugin.start).toHaveBeenCalledTimes(1);
    expect(plugin.start).toHaveBeenCalledWith(startContextMap.get(plugin.name), deps.start);
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

test('`uiPlugins` returns empty Maps before plugins are added', async () => {
  expect(pluginsSystem.uiPlugins()).toMatchInlineSnapshot(`
Object {
  "internal": Map {},
  "public": Map {},
}
`);
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

  [...plugins.keys()].forEach(plugin => {
    pluginsSystem.addPlugin(plugin);
  });

  expect([...pluginsSystem.uiPlugins().internal.keys()]).toMatchInlineSnapshot(`
Array [
  "order-0",
  "order-1",
  "order-2",
  "order-3",
  "order-4",
]
`);
});

test('can start without plugins', async () => {
  await pluginsSystem.setupPlugins(setupDeps);
  const pluginsStart = await pluginsSystem.startPlugins({});

  expect(pluginsStart).toBeInstanceOf(Map);
  expect(pluginsStart.size).toBe(0);
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
  const result = await pluginsSystem.startPlugins({});
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
