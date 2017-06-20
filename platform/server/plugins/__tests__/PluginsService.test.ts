// TODO For some weird reason the tests fail to read correctly from the
// filesystem unless this is here.
const mockFs: any = jest.genMockFromModule('fs');
mockFs.readdir = (err: any, cb: any) => cb(null, ['foo', 'bar']);
jest.mock('fs', () => mockFs);

import { pick } from 'lodash';
import { resolve } from 'path';

import { PluginsService } from '../PluginsService';
import { logger } from '../../../logger/__mocks__';

const examplesPluginsDir = resolve(__dirname, './examplePlugins');

let mockPluginSystem: any = {};

beforeEach(() => {
  mockPluginSystem = {
    addPlugin: jest.fn(),
    startPlugins: jest.fn(),
    stopPlugins: jest.fn()
  };
});

test('starts plugins', () => {
  const pluginsService = new PluginsService(examplesPluginsDir, mockPluginSystem, logger);

  pluginsService.start();

  expect(mockPluginSystem.addPlugin).toHaveBeenCalledTimes(2);
  expect(mockPluginSystem.startPlugins).toHaveBeenCalledTimes(1);

  const pluginsAdded = mockPluginSystem.addPlugin.mock.calls;

  const foo = pick(pluginsAdded[0][0], ['name', 'dependencies']);
  expect(foo).toMatchSnapshot();

  const bar = pick(pluginsAdded[1][0], ['name', 'dependencies']);
  expect(bar).toMatchSnapshot();
});

test('stops plugins', () => {
  const pluginsService = new PluginsService(examplesPluginsDir, mockPluginSystem, logger);

  pluginsService.start();
  pluginsService.stop();

  expect(mockPluginSystem.stopPlugins).toHaveBeenCalledTimes(1);
});
