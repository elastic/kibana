// TODO For some weird reason the tests fail to read correctly from the
// filesystem unless this is here.
const mockFs: any = jest.genMockFromModule('fs');
mockFs.readdir = (err: any, cb: any) => cb(null, ['foo', 'bar']);
jest.mock('fs', () => mockFs);

import { pick } from 'lodash';
import { resolve } from 'path';

import { PluginsService } from '../PluginsService';
import { logger } from '../../../logging/__mocks__';

const examplesPluginsDir = resolve(__dirname, './examplePlugins');

let mockConfigService: any = jest.genMockFromModule(
  '../../../config/ConfigService'
);
let mockPluginSystem: any = jest.genMockFromModule('../PluginSystem');

beforeEach(() => {
  mockPluginSystem = {
    addPlugin: jest.fn(),
    startPlugins: jest.fn(),
    stopPlugins: jest.fn()
  };

  mockConfigService.isEnabledAtPath = jest.fn(() => Promise.resolve(true));
});

test('starts plugins', async () => {
  const pluginsService = new PluginsService(
    examplesPluginsDir,
    mockPluginSystem,
    mockConfigService,
    logger
  );

  await pluginsService.start();

  expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
  expect(mockPluginSystem.startPlugins).toHaveBeenCalledTimes(1);

  const pluginsAdded = mockPluginSystem.addPlugin.mock.calls;

  const foo = pick(pluginsAdded[0][0], ['name', 'dependencies']);
  expect(foo).toMatchSnapshot();

  const bar = pick(pluginsAdded[1][0], ['name', 'dependencies']);
  expect(bar).toMatchSnapshot();
});

test('stops plugins', async () => {
  const pluginsService = new PluginsService(
    examplesPluginsDir,
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

  const pluginsService = new PluginsService(
    examplesPluginsDir,
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
