jest.mock('process', () => ({
  cwd() {
    return '/test/cwd';
  }
}));

jest.mock('path', () => ({
  resolve(...pathSegments: string[]) {
    return pathSegments.join('/');
  }
}));

import { Env } from '../Env';

test('correctly creates default environment with empty options.', () => {
  const defaultEnv = Env.createDefault({});

  expect(defaultEnv.homeDir).toEqual('/test/cwd');
  expect(defaultEnv.configDir).toEqual('/test/cwd/config');
  expect(defaultEnv.pluginsDir).toEqual('/test/cwd/core_plugins');
  expect(defaultEnv.binDir).toEqual('/test/cwd/bin');
  expect(defaultEnv.logDir).toEqual('/test/cwd/log');
  expect(defaultEnv.staticFilesDir).toEqual('/test/cwd/ui');

  expect(defaultEnv.getConfigFile()).toEqual('/test/cwd/config/kibana.yml');
  expect(defaultEnv.getPluginDir('some-plugin')).toEqual(
    '/test/cwd/core_plugins/some-plugin/target/dist'
  );
  expect(defaultEnv.getNewPlatformProxyListener()).toBeUndefined();
});

test('correctly creates default environment with options overrides.', () => {
  const proxyListenerMock = {};
  const defaultEnv = Env.createDefault({
    config: '/some/other/path/some-kibana.yml',
    kbnServer: { newPlatformProxyListener: proxyListenerMock }
  });

  expect(defaultEnv.homeDir).toEqual('/test/cwd');
  expect(defaultEnv.configDir).toEqual('/test/cwd/config');
  expect(defaultEnv.pluginsDir).toEqual('/test/cwd/core_plugins');
  expect(defaultEnv.binDir).toEqual('/test/cwd/bin');
  expect(defaultEnv.logDir).toEqual('/test/cwd/log');
  expect(defaultEnv.staticFilesDir).toEqual('/test/cwd/ui');

  expect(defaultEnv.getConfigFile()).toEqual(
    '/some/other/path/some-kibana.yml'
  );
  expect(defaultEnv.getPluginDir('some-plugin')).toEqual(
    '/test/cwd/core_plugins/some-plugin/target/dist'
  );
  expect(defaultEnv.getNewPlatformProxyListener()).toBe(proxyListenerMock);
});

test('correctly creates environment with constructor.', () => {
  const defaultEnv = new Env('/some/home/dir', {
    config: '/some/other/path/some-kibana.yml'
  });

  expect(defaultEnv.homeDir).toEqual('/some/home/dir');
  expect(defaultEnv.configDir).toEqual('/some/home/dir/config');
  expect(defaultEnv.pluginsDir).toEqual('/some/home/dir/core_plugins');
  expect(defaultEnv.binDir).toEqual('/some/home/dir/bin');
  expect(defaultEnv.logDir).toEqual('/some/home/dir/log');
  expect(defaultEnv.staticFilesDir).toEqual('/some/home/dir/ui');

  expect(defaultEnv.getConfigFile()).toEqual(
    '/some/other/path/some-kibana.yml'
  );
  expect(defaultEnv.getPluginDir('some-plugin')).toEqual(
    '/some/home/dir/core_plugins/some-plugin/target/dist'
  );
  expect(defaultEnv.getNewPlatformProxyListener()).toBeUndefined();
});
