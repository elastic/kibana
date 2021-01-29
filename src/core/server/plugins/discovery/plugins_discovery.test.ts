/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// must be before mocks imports to avoid conflicting with `REPO_ROOT` accessor.
import { REPO_ROOT } from '@kbn/dev-utils';
import { mockPackage } from './plugins_discovery.test.mocks';
import mockFs from 'mock-fs';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { getEnvOptions, rawConfigServiceMock } from '../../config/mocks';

import { first, map, toArray } from 'rxjs/operators';
import { resolve } from 'path';
import { ConfigService, Env } from '../../config';
import { PluginsConfig, PluginsConfigType, config } from '../plugins_config';
import type { InstanceInfo } from '../plugin_context';
import { discover } from './plugins_discovery';
import { CoreContext } from '../../core_context';

const KIBANA_ROOT = process.cwd();

const Plugins = {
  invalid: () => ({
    'kibana.json': 'not-json',
  }),
  incomplete: () => ({
    'kibana.json': JSON.stringify({ version: '1' }),
  }),
  incompatible: () => ({
    'kibana.json': JSON.stringify({ id: 'plugin', version: '1' }),
  }),
  missingManifest: () => ({}),
  inaccessibleManifest: () => ({
    'kibana.json': mockFs.file({
      mode: 0, // 0000,
      content: JSON.stringify({ id: 'plugin', version: '1' }),
    }),
  }),
  valid: (id: string) => ({
    'kibana.json': JSON.stringify({
      id,
      configPath: ['plugins', id],
      version: '1',
      kibanaVersion: '1.2.3',
      requiredPlugins: [],
      optionalPlugins: [],
      server: true,
    }),
  }),
};

const packageMock = {
  branch: 'master',
  version: '1.2.3',
  build: {
    distributable: true,
    number: 1,
    sha: '',
  },
};

const manifestPath = (...pluginPath: string[]) =>
  resolve(KIBANA_ROOT, 'src', 'plugins', ...pluginPath, 'kibana.json');

describe('plugins discovery system', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let instanceInfo: InstanceInfo;
  let env: Env;
  let configService: ConfigService;
  let pluginConfig: PluginsConfigType;
  let coreContext: CoreContext;

  beforeEach(async () => {
    logger = loggingSystemMock.create();

    mockPackage.raw = packageMock;

    instanceInfo = {
      uuid: 'instance-uuid',
    };

    env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        cliArgs: { envName: 'development' },
      })
    );

    configService = new ConfigService(
      rawConfigServiceMock.create({ rawConfig: { plugins: { paths: [] } } }),
      env,
      logger
    );
    await configService.setSchema(config.path, config.schema);

    coreContext = {
      coreId: Symbol(),
      configService,
      env,
      logger,
    };

    pluginConfig = await configService
      .atPath<PluginsConfigType>('plugins')
      .pipe(first())
      .toPromise();

    // jest relies on the filesystem to get sourcemaps when using console.log
    // which breaks with the mocked FS, see https://github.com/tschaub/mock-fs/issues/234
    // hijacking logging to process.stdout as a workaround for this suite.
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      process.stdout.write(args + '\n');
    });
  });

  afterEach(() => {
    mockFs.restore();
    // restore the console.log behavior
    jest.restoreAllMocks();
  });

  it('discovers plugins in the search locations', async () => {
    const { plugin$ } = discover(new PluginsConfig(pluginConfig, env), coreContext, instanceInfo);

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
        [`${KIBANA_ROOT}/plugins/plugin_b`]: Plugins.valid('pluginB'),
        [`${KIBANA_ROOT}/x-pack/plugins/plugin_c`]: Plugins.valid('pluginC'),
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(3);
    expect(pluginNames).toEqual(expect.arrayContaining(['pluginA', 'pluginB', 'pluginC']));
  });

  it('return errors when the manifest is invalid or incompatible', async () => {
    const { plugin$, error$ } = discover(
      new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo
    );

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.invalid(),
        [`${KIBANA_ROOT}/src/plugins/plugin_b`]: Plugins.incomplete(),
        [`${KIBANA_ROOT}/src/plugins/plugin_c`]: Plugins.incompatible(),
        [`${KIBANA_ROOT}/src/plugins/plugin_ad`]: Plugins.missingManifest(),
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    expect(plugins).toHaveLength(0);

    const errors = await error$
      .pipe(
        map((error) => error.toString()),
        toArray()
      )
      .toPromise();

    expect(errors).toEqual(
      expect.arrayContaining([
        `Error: Unexpected token o in JSON at position 1 (invalid-manifest, ${manifestPath(
          'plugin_a'
        )})`,
        `Error: Plugin manifest must contain an "id" property. (invalid-manifest, ${manifestPath(
          'plugin_b'
        )})`,
        `Error: Plugin "plugin" is only compatible with Kibana version "1", but used Kibana version is "1.2.3". (incompatible-version, ${manifestPath(
          'plugin_c'
        )})`,
      ])
    );
  });

  it('return errors when the plugin search path is not accessible', async () => {
    const { plugin$, error$ } = discover(
      new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo
    );

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins`]: mockFs.directory({
          mode: 0, // 0000
          items: {
            plugin_a: Plugins.valid('pluginA'),
          },
        }),
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    expect(plugins).toHaveLength(0);

    const errors = await error$
      .pipe(
        map((error) => error.toString()),
        toArray()
      )
      .toPromise();

    const srcPluginsPath = resolve(KIBANA_ROOT, 'src', 'plugins');
    const xpackPluginsPath = resolve(KIBANA_ROOT, 'x-pack', 'plugins');
    expect(errors).toEqual(
      expect.arrayContaining([
        `Error: EACCES, permission denied '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
        `Error: ENOENT, no such file or directory '${xpackPluginsPath}' (invalid-search-path, ${xpackPluginsPath})`,
      ])
    );
  });

  it('return an error when the manifest file is not accessible', async () => {
    const { plugin$, error$ } = discover(
      new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo
    );

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: {
          ...Plugins.inaccessibleManifest(),
          nested_plugin: Plugins.valid('nestedPlugin'),
        },
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    expect(plugins).toHaveLength(0);

    const errors = await error$
      .pipe(
        map((error) => error.toString()),
        toArray()
      )
      .toPromise();

    const errorPath = manifestPath('plugin_a');
    expect(errors).toEqual(
      expect.arrayContaining([
        `Error: EACCES, permission denied '${errorPath}' (missing-manifest, ${errorPath})`,
      ])
    );
  });

  it('discovers plugins in nested directories', async () => {
    const { plugin$, error$ } = discover(
      new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo
    );

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
        [`${KIBANA_ROOT}/src/plugins/sub1/plugin_b`]: Plugins.valid('pluginB'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_c`]: Plugins.valid('pluginC'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_d`]: Plugins.incomplete(),
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(3);
    expect(pluginNames).toEqual(expect.arrayContaining(['pluginA', 'pluginB', 'pluginC']));

    const errors = await error$
      .pipe(
        map((error) => error.toString()),
        toArray()
      )
      .toPromise();

    expect(errors).toEqual(
      expect.arrayContaining([
        `Error: Plugin manifest must contain an "id" property. (invalid-manifest, ${manifestPath(
          'sub1',
          'sub2',
          'plugin_d'
        )})`,
      ])
    );
  });

  it('does not discover plugins nested inside another plugin', async () => {
    const { plugin$ } = discover(new PluginsConfig(pluginConfig, env), coreContext, instanceInfo);

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: {
          ...Plugins.valid('pluginA'),
          nested_plugin: Plugins.valid('nestedPlugin'),
        },
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toEqual(['pluginA']);
  });

  it('stops scanning when reaching `maxDepth`', async () => {
    const { plugin$ } = discover(new PluginsConfig(pluginConfig, env), coreContext, instanceInfo);

    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/sub1/plugin`]: Plugins.valid('plugin1'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin`]: Plugins.valid('plugin2'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/plugin`]: Plugins.valid('plugin3'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/plugin`]: Plugins.valid('plugin4'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/plugin`]: Plugins.valid('plugin5'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/sub6/plugin`]: Plugins.valid(
          'plugin6'
        ),
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(5);
    expect(pluginNames).toEqual(
      expect.arrayContaining(['plugin1', 'plugin2', 'plugin3', 'plugin4', 'plugin5'])
    );
  });

  it('works with symlinks', async () => {
    const { plugin$ } = discover(new PluginsConfig(pluginConfig, env), coreContext, instanceInfo);

    const pluginFolder = resolve(KIBANA_ROOT, '..', 'ext-plugins');

    mockFs(
      {
        [`${KIBANA_ROOT}/plugins`]: mockFs.symlink({
          path: '../ext-plugins',
        }),
        [pluginFolder]: {
          plugin_a: Plugins.valid('pluginA'),
          plugin_b: Plugins.valid('pluginB'),
        },
      },
      { createCwd: false }
    );

    const plugins = await plugin$.pipe(toArray()).toPromise();
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(2);
    expect(pluginNames).toEqual(expect.arrayContaining(['pluginA', 'pluginB']));
  });

  it('logs a warning about --plugin-path when used in development', async () => {
    const extraPluginTestPath = resolve(process.cwd(), 'my-extra-plugin');

    env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        cliArgs: { dev: false, envName: 'development' },
      })
    );

    discover(
      new PluginsConfig({ ...pluginConfig, paths: [extraPluginTestPath] }, env),
      {
        coreId: Symbol(),
        configService,
        env,
        logger,
      },
      instanceInfo
    );

    expect(loggingSystemMock.collect(logger).warn).toEqual([
      [
        `Explicit plugin paths [${extraPluginTestPath}] should only be used in development. Relative imports may not work properly in production.`,
      ],
    ]);
  });

  test('does not log a warning about --plugin-path when used in production', async () => {
    const extraPluginTestPath = resolve(process.cwd(), 'my-extra-plugin');

    env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        cliArgs: { dev: false, envName: 'production' },
      })
    );

    discover(
      new PluginsConfig({ ...pluginConfig, paths: [extraPluginTestPath] }, env),
      {
        coreId: Symbol(),
        configService,
        env,
        logger,
      },
      instanceInfo
    );

    expect(loggingSystemMock.collect(logger).warn).toEqual([]);
  });
});
