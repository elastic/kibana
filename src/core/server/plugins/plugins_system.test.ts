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

import { CoreContext } from '../../types';

const mockCreatePluginStartContext = jest.fn();
jest.mock('./plugin_context', () => ({
  createPluginStartContext: mockCreatePluginStartContext,
}));

import { BehaviorSubject } from 'rxjs';
import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { logger } from '../logging/__mocks__';
import { Plugin, PluginName } from './plugin';
import { PluginsSystem } from './plugins_system';

function createPlugin(
  id: string,
  {
    required = [],
    optional = [],
    server = true,
  }: { required?: string[]; optional?: string[]; server?: boolean } = {}
) {
  return new Plugin(
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

test('can be started even without plugins', async () => {
  const pluginsContracts = await pluginsSystem.startPlugins();

  expect(pluginsContracts).toBeInstanceOf(Map);
  expect(pluginsContracts.size).toBe(0);
});

test('`startPlugins` throws plugin has missing required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('some-id', { required: ['missing-dep'] }));

  await expect(pluginsSystem.startPlugins()).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these edges could not be ordered: [["some-id",{}]]]`
  );
});

test('`startPlugins` throws if plugins have circular required dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { required: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { required: ['depends-on-1'] }));

  await expect(pluginsSystem.startPlugins()).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these edges could not be ordered: [["depends-on-1",{}],["depends-on-2",{}]]]`
  );
});

test('`startPlugins` throws if plugins have circular optional dependency', async () => {
  pluginsSystem.addPlugin(createPlugin('no-dep'));
  pluginsSystem.addPlugin(createPlugin('depends-on-1', { optional: ['depends-on-2'] }));
  pluginsSystem.addPlugin(createPlugin('depends-on-2', { optional: ['depends-on-1'] }));

  await expect(pluginsSystem.startPlugins()).rejects.toMatchInlineSnapshot(
    `[Error: Topological ordering of plugins did not complete, these edges could not be ordered: [["depends-on-1",{}],["depends-on-2",{}]]]`
  );
});

test('`startPlugins` ignores missing optional dependency', async () => {
  const plugin = createPlugin('some-id', { optional: ['missing-dep'] });
  jest.spyOn(plugin, 'start').mockResolvedValue('test');

  pluginsSystem.addPlugin(plugin);

  expect([...(await pluginsSystem.startPlugins())]).toMatchInlineSnapshot(`
Array [
  Array [
    "some-id",
    "test",
  ],
]
`);
});

test('`startPlugins` correctly orders plugins and returns exposed values', async () => {
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
  ] as Array<[Plugin, Record<PluginName, unknown>]>);

  const startContextMap = new Map();

  [...plugins.keys()].forEach((plugin, index) => {
    jest.spyOn(plugin, 'start').mockResolvedValue(`added-as-${index}`);

    startContextMap.set(plugin.name, `start-for-${plugin.name}`);

    pluginsSystem.addPlugin(plugin);
  });

  mockCreatePluginStartContext.mockImplementation((_, plugin) => startContextMap.get(plugin.name));

  expect([...(await pluginsSystem.startPlugins())]).toMatchInlineSnapshot(`
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
    expect(mockCreatePluginStartContext).toHaveBeenCalledWith(coreContext, plugin);
    expect(plugin.start).toHaveBeenCalledTimes(1);
    expect(plugin.start).toHaveBeenCalledWith(startContextMap.get(plugin.name), deps);
  }
});

test('`startPlugins` only starts plugins that have server side', async () => {
  const firstPluginToRun = createPlugin('order-0');
  const secondPluginNotToRun = createPlugin('order-not-run', { server: false });
  const thirdPluginToRun = createPlugin('order-1');

  [firstPluginToRun, secondPluginNotToRun, thirdPluginToRun].forEach((plugin, index) => {
    jest.spyOn(plugin, 'start').mockResolvedValue(`added-as-${index}`);

    pluginsSystem.addPlugin(plugin);
  });

  expect([...(await pluginsSystem.startPlugins())]).toMatchInlineSnapshot(`
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

  expect(mockCreatePluginStartContext).toHaveBeenCalledWith(coreContext, firstPluginToRun);
  expect(mockCreatePluginStartContext).not.toHaveBeenCalledWith(coreContext, secondPluginNotToRun);
  expect(mockCreatePluginStartContext).toHaveBeenCalledWith(coreContext, thirdPluginToRun);

  expect(firstPluginToRun.start).toHaveBeenCalledTimes(1);
  expect(secondPluginNotToRun.start).not.toHaveBeenCalled();
  expect(thirdPluginToRun.start).toHaveBeenCalledTimes(1);
});
