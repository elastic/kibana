import { pick } from 'lodash';
import { resolve } from 'path';
import { BehaviorSubject } from '@elastic/kbn-observable';

import { PluginsService } from '../PluginsService';
import { PluginsConfig } from '../PluginsConfig';
import { logger } from '../../../logging/__mocks__';

let mockConfigService: any = jest.genMockFromModule(
  '../../../config/ConfigService'
);
let mockPluginSystem: any = jest.genMockFromModule('../PluginSystem');
let env: any = jest.genMockFromModule('../../../config/Env');

beforeEach(() => {
  mockPluginSystem = {
    addPlugin: jest.fn(),
    startPlugins: jest.fn(),
    stopPlugins: jest.fn()
  };

  env.corePluginsDir = resolve(__dirname, 'examplePlugins');

  mockConfigService.isEnabledAtPath = jest.fn(() => Promise.resolve(true));
  mockConfigService.env = env;
});

test('starts plugins', async () => {
  const pluginsConfig = new PluginsConfig({ scanDirs: [] }, env);
  const pluginsConfig$ = new BehaviorSubject(pluginsConfig);

  const pluginsService = new PluginsService(
    pluginsConfig$,
    mockPluginSystem,
    mockConfigService,
    logger
  );

  await pluginsService.start();

  expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
  expect(mockPluginSystem.startPlugins).toHaveBeenCalledTimes(1);

  const pluginsAdded = mockPluginSystem.addPlugin.mock.calls;

  const bar = pick(pluginsAdded[0][0], ['name', 'dependencies', 'configPath']);
  expect(bar).toMatchSnapshot();

  const foo = pick(pluginsAdded[1][0], ['name', 'dependencies', 'configPath']);
  expect(foo).toMatchSnapshot();
});

test('stops plugins', async () => {
  const pluginsConfig = new PluginsConfig({ scanDirs: [] }, env);
  const pluginsConfig$ = new BehaviorSubject(pluginsConfig);

  const pluginsService = new PluginsService(
    pluginsConfig$,
    mockPluginSystem,
    mockConfigService,
    logger
  );

  await pluginsService.start();
  pluginsService.stop();

  expect(mockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
});

test('does not start plugin if disabled', async () => {
  mockConfigService.isEnabledAtPath = jest.fn(configPath => {
    if (configPath === 'bar') {
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
  });

  const pluginsConfig = new PluginsConfig({ scanDirs: [] }, env);
  const pluginsConfig$ = new BehaviorSubject(pluginsConfig);

  const pluginsService = new PluginsService(
    pluginsConfig$,
    mockPluginSystem,
    mockConfigService,
    logger
  );

  await pluginsService.start();

  expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(1);
  expect(mockPluginSystem.startPlugins).toHaveBeenCalledTimes(1);

  const pluginsAdded = mockPluginSystem.addPlugin.mock.calls;

  expect(pluginsAdded[0][0].name).toBe('foo');
  expect(logger._collect()).toMatchSnapshot();
});
