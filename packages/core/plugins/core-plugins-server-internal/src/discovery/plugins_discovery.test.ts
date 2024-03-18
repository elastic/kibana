/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// must be before mocks imports to avoid conflicting with `REPO_ROOT` accessor.
import { REPO_ROOT } from '@kbn/repo-info';
import { mockPackage, scanPluginSearchPathsMock } from './plugins_discovery.test.mocks';
import mockFs from 'mock-fs';
import { getEnvOptions, rawConfigServiceMock } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Package } from '@kbn/repo-packages';

import { firstValueFrom, from } from 'rxjs';
import { map, toArray } from 'rxjs/operators';
import { resolve } from 'path';
import { ConfigService, Env } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { NodeInfo } from '@kbn/core-node-server';
import { PluginsConfig, PluginsConfigType, config } from '../plugins_config';
import type { InstanceInfo } from '../plugin_context';
import { discover } from './plugins_discovery';
import { PluginType } from '@kbn/core-base-common';

jest.mock('@kbn/repo-packages', () => ({
  ...jest.requireActual('@kbn/repo-packages'),
  getPluginPackagesFilter: jest.fn().mockReturnValue(() => true),
}));

jest.mock('./plugin_manifest_from_plugin_package', () => ({
  pluginManifestFromPluginPackage: jest.fn((version, pkgManifest) => ({
    version,
    ...pkgManifest,
  })),
}));

const getPluginPackagesFilterMock: jest.Mock =
  jest.requireMock('@kbn/repo-packages').getPluginPackagesFilter;
const pluginManifestFromPluginPackageMock: jest.Mock = jest.requireMock(
  './plugin_manifest_from_plugin_package'
).pluginManifestFromPluginPackage;

function getMockPackage(id: string) {
  return {
    id,
    manifest: {
      id,
      type: 'plugin',
    },
    directory: resolve(REPO_ROOT, `packages/${id}`),
  } as Package;
}

const Plugins = {
  invalid: () => ({
    'kibana.json': 'not-json',
  }),
  incomplete: () => ({
    'kibana.json': JSON.stringify({
      version: '1',
      owner: {
        name: 'foo',
        githubTeam: 'foo',
      },
    }),
  }),
  incompatible: () => ({
    'kibana.json': JSON.stringify({
      id: 'plugin',
      version: '1',
      owner: {
        name: 'foo',
        githubTeam: 'foo',
      },
    }),
  }),
  incompatibleType: (id: string) => ({
    'kibana.json': JSON.stringify({
      id,
      version: '1',
      kibanaVersion: '1.2.3',
      type: 'evenEarlierThanPreboot',
      server: true,
      owner: {
        name: 'foo',
        githubTeam: 'foo',
      },
    }),
  }),
  missingManifest: () => ({}),
  inaccessibleManifest: () => ({
    'kibana.json': mockFs.file({
      mode: 0, // 0000,
      content: JSON.stringify({ id: 'plugin', version: '1' }),
    }),
  }),
  missingOwnerAttribute: () => ({
    'kibana.json': JSON.stringify({
      id: 'foo',
      configPath: ['plugins', 'foo'],
      version: '1',
      kibanaVersion: '1.2.3',
      requiredPlugins: [],
      optionalPlugins: [],
      server: true,
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
      owner: {
        name: 'foo',
        githubTeam: 'foo',
      },
    }),
  }),
  validPreboot: (id: string) => ({
    'kibana.json': JSON.stringify({
      id,
      configPath: ['plugins', id],
      version: '1',
      kibanaVersion: '1.2.3',
      type: PluginType.preboot,
      requiredPlugins: [],
      optionalPlugins: [],
      server: true,
      owner: {
        name: 'foo',
        githubTeam: 'foo',
      },
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

const pluginDir = (...segments: string[]) => resolve(REPO_ROOT, 'plugins', ...segments);
const manifestPath = (...pluginPath: string[]) => resolve(pluginDir(...pluginPath), 'kibana.json');

describe('plugins discovery system', () => {
  let logger: ReturnType<typeof loggingSystemMock.create>;
  let instanceInfo: InstanceInfo;
  let nodeInfo: NodeInfo;
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

    nodeInfo = {
      roles: {
        backgroundTasks: true,
        ui: true,
        migrator: false,
      },
    };

    env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        cliArgs: { envName: 'development' },
        repoPackages: [],
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

    pluginConfig = await firstValueFrom(configService.atPath<PluginsConfigType>('plugins'));

    // jest relies on the filesystem to get sourcemaps when using console.log
    // which breaks with the mocked FS, see https://github.com/tschaub/mock-fs/issues/234
    // hijacking logging to process.stdout as a workaround for this suite.
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      process.stdout.write(args + '\n');
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
    // restore the console.log behavior
    jest.clearAllMocks();
  });

  it('discovers plugins in the search locations', async () => {
    const { plugin$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir('plugin_a')]: Plugins.valid('pluginA'),
        [pluginDir('plugin_b')]: Plugins.valid('pluginB'),
        [pluginDir(`plugin_c`)]: Plugins.valid('pluginC'),
        [pluginDir(`plugin_d`)]: Plugins.validPreboot('pluginD'),
      },
      { createCwd: false }
    );

    const plugins = await firstValueFrom(plugin$.pipe(toArray()));
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(4);
    expect(pluginNames).toEqual(
      expect.arrayContaining(['pluginA', 'pluginB', 'pluginC', 'pluginD'])
    );
  });

  it('return errors when the manifest is invalid or incompatible', async () => {
    const { plugin$, error$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir(`plugin_a`)]: Plugins.invalid(),
        [pluginDir(`plugin_b`)]: Plugins.incomplete(),
        [pluginDir(`plugin_c`)]: Plugins.incompatible(),
        [pluginDir(`plugin_d`)]: Plugins.incompatibleType('pluginD'),
        [pluginDir(`plugin_ad`)]: Plugins.missingManifest(),
        [pluginDir(`plugin_e`)]: Plugins.missingOwnerAttribute(),
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

    expect(errors).toContain(
      `Error: Unexpected token 'o', "not-json" is not valid JSON (invalid-manifest, ${manifestPath(
        'plugin_a'
      )})`
    );

    expect(errors).toContain(
      `Error: Plugin manifest must contain an "id" property. (invalid-manifest, ${manifestPath(
        'plugin_b'
      )})`
    );

    expect(errors).toContain(
      `Error: Plugin "plugin" is only compatible with Kibana version "1", but used Kibana version is "1.2.3". (incompatible-version, ${manifestPath(
        'plugin_c'
      )})`
    );

    expect(errors).toContain(
      `Error: The "type" in manifest for plugin "pluginD" is set to "evenEarlierThanPreboot", but it should either be "standard" or "preboot". (invalid-manifest, ${manifestPath(
        'plugin_d'
      )})`
    );

    expect(errors).toContain(
      `Error: The "type" in manifest for plugin "pluginD" is set to "evenEarlierThanPreboot", but it should either be "standard" or "preboot". (invalid-manifest, ${manifestPath(
        'plugin_d'
      )})`
    );

    expect(errors).toContain(
      `Error: Plugin manifest for "foo" must contain an "owner" property, which includes a nested "name" property. (invalid-manifest, ${manifestPath(
        'plugin_e'
      )})`
    );
  });

  it('return errors when the plugin search path is not accessible', async () => {
    const { plugin$, error$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir('.')]: mockFs.directory({
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

    const srcPluginsPath = pluginDir('.');
    expect(errors).toEqual(
      expect.arrayContaining([
        `Error: EACCES, permission denied '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
      ])
    );
  });

  it('return errors when the plugin search path is missing', async () => {
    const { plugin$, error$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs({}, { createCwd: false });

    const plugins = await plugin$.pipe(toArray()).toPromise();
    expect(plugins).toHaveLength(0);

    const errors = await error$
      .pipe(
        map((error) => error.toString()),
        toArray()
      )
      .toPromise();

    const srcPluginsPath = pluginDir('.');
    expect(errors).toEqual(
      expect.arrayContaining([
        `Error: ENOENT, no such file or directory '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
      ])
    );
  });

  it('return an error when the manifest file is not accessible', async () => {
    const { plugin$, error$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir(`plugin_a`)]: {
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
    const { plugin$, error$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir(`plugin_a`)]: Plugins.valid('pluginA'),
        [pluginDir(`sub1/plugin_b`)]: Plugins.valid('pluginB'),
        [pluginDir(`sub1/sub2/plugin_c`)]: Plugins.valid('pluginC'),
        [pluginDir(`sub1/sub2/plugin_d`)]: Plugins.validPreboot('pluginD'),
        [pluginDir(`sub1/sub2/plugin_e`)]: Plugins.incomplete(),
      },
      { createCwd: false }
    );

    const plugins = await firstValueFrom(plugin$.pipe(toArray()));
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(4);
    expect(pluginNames).toEqual(
      expect.arrayContaining(['pluginA', 'pluginB', 'pluginC', 'pluginD'])
    );

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
          'plugin_e'
        )})`,
      ])
    );
  });

  it('does not discover plugins nested inside another plugin', async () => {
    const { plugin$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir(`plugin_a`)]: {
          ...Plugins.valid('pluginA'),
          nested_plugin: Plugins.valid('nestedPlugin'),
        },
      },
      { createCwd: false }
    );

    const plugins = await firstValueFrom(plugin$.pipe(toArray()));
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toEqual(['pluginA']);
  });

  it('stops scanning when reaching `maxDepth`', async () => {
    const { plugin$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    mockFs(
      {
        [pluginDir(`sub1/plugin`)]: Plugins.valid('plugin1'),
        [pluginDir(`sub1/sub2/plugin`)]: Plugins.valid('plugin2'),
        [pluginDir(`sub1/sub2/sub3/plugin`)]: Plugins.valid('plugin3'),
        [pluginDir(`sub1/sub2/sub3/sub4/plugin`)]: Plugins.valid('plugin4'),
        [pluginDir(`sub1/sub2/sub3/sub4/sub5/plugin`)]: Plugins.valid('plugin5'),
        [pluginDir(`sub1/sub2/sub3/sub4/sub5/sub6/plugin`)]: Plugins.valid('plugin6'),
      },
      { createCwd: false }
    );

    const plugins = await firstValueFrom(plugin$.pipe(toArray()));
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(5);
    expect(pluginNames).toEqual(
      expect.arrayContaining(['plugin1', 'plugin2', 'plugin3', 'plugin4', 'plugin5'])
    );
  });

  it('works with symlinks', async () => {
    const { plugin$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    const pluginFolder = pluginDir('../ext-plugins');

    mockFs(
      {
        [pluginDir(`.`)]: mockFs.symlink({
          path: pluginFolder,
        }),
        [pluginFolder]: {
          plugin_a: Plugins.valid('pluginA'),
          plugin_b: Plugins.valid('pluginB'),
          plugin_c: Plugins.validPreboot('pluginC'),
        },
      },
      { createCwd: false }
    );

    const plugins = await firstValueFrom(plugin$.pipe(toArray()));
    const pluginNames = plugins.map((plugin) => plugin.name);

    expect(pluginNames).toHaveLength(3);
    expect(pluginNames).toEqual(expect.arrayContaining(['pluginA', 'pluginB', 'pluginC']));
  });

  it('logs a warning about --plugin-path when used in development', async () => {
    const extraPluginTestPath = resolve(process.cwd(), 'my-extra-plugin');

    env = Env.createDefault(
      REPO_ROOT,
      getEnvOptions({
        cliArgs: { dev: false, envName: 'development' },
      })
    );

    discover({
      config: new PluginsConfig({ ...pluginConfig, paths: [extraPluginTestPath] }, env),
      coreContext: {
        coreId: Symbol(),
        configService,
        env,
        logger,
      },
      instanceInfo,
      nodeInfo,
    });

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

    discover({
      config: new PluginsConfig({ ...pluginConfig, paths: [extraPluginTestPath] }, env),
      coreContext: {
        coreId: Symbol(),
        configService,
        env,
        logger,
      },
      instanceInfo,
      nodeInfo,
    });

    expect(loggingSystemMock.collect(logger).warn).toEqual([]);
  });

  describe('plugin packages', () => {
    it('filters repoPackages in the env and converts them to PluginWrappers', async () => {
      const foo = getMockPackage('foo');
      const bar = getMockPackage('bar');
      coreContext.env = {
        ...env,
        pluginSearchPaths: [],
        repoPackages: [foo, bar],
      };
      const filterFn = jest.fn((p: Package) => p === foo);
      getPluginPackagesFilterMock.mockReturnValue(filterFn);

      const { plugin$ } = discover({
        config: new PluginsConfig(pluginConfig, coreContext.env),
        coreContext,
        instanceInfo,
        nodeInfo,
      });

      const [plugin, ...empty] = await firstValueFrom(plugin$.pipe(toArray()));
      expect(empty).toHaveLength(0);

      expect(getPluginPackagesFilterMock).toHaveBeenCalledTimes(1);
      const filterArgs = getPluginPackagesFilterMock.mock.calls[0];
      expect(filterArgs).toEqual([
        {
          examples: false,
          oss: false,
          parentDirs: [],
          paths: [],
        },
      ]);

      expect(filterFn).toHaveBeenCalledTimes(2);
      expect(filterFn.mock.calls[0]).toEqual([foo, 0]);
      expect(filterFn.mock.calls[1]).toEqual([bar, 1]);
      expect(filterFn.mock.results).toEqual([
        { type: 'return', value: true },
        { type: 'return', value: false },
      ]);

      expect(pluginManifestFromPluginPackageMock).toHaveBeenCalledTimes(1);
      const manifestArgs = pluginManifestFromPluginPackageMock.mock.calls[0];
      expect(manifestArgs).toEqual([coreContext.env.packageInfo.version, foo.manifest]);
      expect(pluginManifestFromPluginPackageMock.mock.results[0]).toEqual({
        type: 'return',
        value: plugin.manifest,
      });
    });
  });

  describe('discovery order', () => {
    beforeEach(() => {
      scanPluginSearchPathsMock.mockClear();
      getPluginPackagesFilterMock.mockReturnValue(() => true);
    });

    it('returns the plugins in a deterministic order', async () => {
      mockFs(
        {
          [`${REPO_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
          [`${REPO_ROOT}/plugins/plugin_b`]: Plugins.valid('pluginB'),
          [`${REPO_ROOT}/x-pack/plugins/plugin_c`]: Plugins.valid('pluginC'),
        },
        { createCwd: false }
      );

      scanPluginSearchPathsMock.mockReturnValue(
        from([
          `${REPO_ROOT}/src/plugins/plugin_a`,
          `${REPO_ROOT}/plugins/plugin_b`,
          `${REPO_ROOT}/x-pack/plugins/plugin_c`,
        ])
      );

      coreContext.env = {
        ...env,
        repoPackages: [getMockPackage('foo'), getMockPackage('bar')],
      };

      let { plugin$ } = discover({
        config: new PluginsConfig(pluginConfig, coreContext.env),
        coreContext,
        instanceInfo,
        nodeInfo,
      });

      expect(scanPluginSearchPathsMock).toHaveBeenCalledTimes(1);
      let plugins = await firstValueFrom(plugin$.pipe(toArray()));
      let pluginNames = plugins.map((plugin) => plugin.name);

      // order coming from `ROOT/packages` -> `ROOT/plugin` -> `ROOT/src/plugins` -> // ROOT/x-pack
      expect(pluginNames).toEqual(['bar', 'foo', 'pluginB', 'pluginA', 'pluginC']);

      // second pass
      scanPluginSearchPathsMock.mockReturnValue(
        from([
          `${REPO_ROOT}/plugins/plugin_b`,
          `${REPO_ROOT}/x-pack/plugins/plugin_c`,
          `${REPO_ROOT}/src/plugins/plugin_a`,
        ])
      );

      coreContext.env = {
        ...env,
        repoPackages: [getMockPackage('bar'), getMockPackage('foo')],
      };

      plugin$ = discover({
        config: new PluginsConfig(pluginConfig, env),
        coreContext,
        instanceInfo,
        nodeInfo,
      }).plugin$;

      expect(scanPluginSearchPathsMock).toHaveBeenCalledTimes(2);
      plugins = await firstValueFrom(plugin$.pipe(toArray()));
      pluginNames = plugins.map((plugin) => plugin.name);

      // order coming from `ROOT/packages` -> `ROOT/plugin` -> `ROOT/src/plugins` -> // ROOT/x-pack
      expect(pluginNames).toEqual(['bar', 'foo', 'pluginB', 'pluginA', 'pluginC']);
    });
  });
});
