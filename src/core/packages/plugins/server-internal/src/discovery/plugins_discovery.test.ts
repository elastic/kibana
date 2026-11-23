/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// must be before mocks imports to avoid conflicting with `REPO_ROOT` accessor.
import { REPO_ROOT } from '@kbn/repo-info';
import {
  mockPackage,
  mockReadFileErrors,
  scanPluginSearchPathsMock,
} from './plugins_discovery.test.mocks';
import { randomUUID } from 'crypto';
import { mkdirSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { getEnvOptions, rawConfigServiceMock } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { Package } from '@kbn/repo-packages';

import { firstValueFrom, from } from 'rxjs';
import { map, toArray } from 'rxjs';
import { join, resolve } from 'path';
import { ConfigService, Env } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { NodeInfo } from '@kbn/core-node-server';
import type { KibanaGroup } from '@kbn/projects-solutions-groups';
import { PluginType } from '@kbn/core-base-common';
import type { PluginsConfigType } from '../plugins_config';
import { PluginsConfig, config } from '../plugins_config';
import type { InstanceInfo } from '../plugin_context';
import { writeFileTree } from '../test_helpers/file_tree';
import { discover } from './plugins_discovery';

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

const getPluginPackagesFilter = jest.requireActual('@kbn/repo-packages').getPluginPackagesFilter;

const getPluginPackagesFilterMock: jest.Mock =
  jest.requireMock('@kbn/repo-packages').getPluginPackagesFilter;
const pluginManifestFromPluginPackageMock: jest.Mock = jest.requireMock(
  './plugin_manifest_from_plugin_package'
).pluginManifestFromPluginPackage;

const TMP_DIR = join(tmpdir(), `plugins-discovery-${randomUUID()}`);
const KIBANA_ROOT = join(TMP_DIR, 'kibana');

function getMockPackage(id: string, group: string = 'platform') {
  const relativePath = `packages/${id}`;
  return {
    id,
    manifest: {
      id,
      type: 'plugin',
    },
    group,
    isPlugin: () => true,
    isDevOnly: () => false,
    getPluginCategories: () => ({
      oss: false,
    }),
    getGroup: () => group,
    directory: resolve(KIBANA_ROOT, relativePath),
    normalizedRepoRelativeDir: relativePath,
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
    date: '2023-05-15T23:12:09.000Z',
  },
};

const pluginDir = (...segments: string[]) => resolve(KIBANA_ROOT, 'plugins', ...segments);
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
    mkdirSync(TMP_DIR, { mode: 0o700 });
    logger = loggingSystemMock.create();

    mockPackage.raw = packageMock;

    instanceInfo = {
      uuid: 'instance-uuid',
      airgapped: false,
    };

    nodeInfo = {
      roles: {
        backgroundTasks: true,
        ui: true,
        migrator: false,
      },
    };

    env = Env.createDefault(
      KIBANA_ROOT,
      getEnvOptions({
        cliArgs: { envName: 'development' },
        repoPackages: [],
      }),
      packageMock
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

    jest.clearAllMocks();
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
    mockReadFileErrors.clear();
    jest.clearAllMocks();
  });

  it('discovers plugins in the search locations', async () => {
    const { plugin$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    writeFileTree(TMP_DIR, {
      [pluginDir('plugin_a')]: Plugins.valid('pluginA'),
      [pluginDir('plugin_b')]: Plugins.valid('pluginB'),
      [pluginDir(`plugin_c`)]: Plugins.valid('pluginC'),
      [pluginDir(`plugin_d`)]: Plugins.validPreboot('pluginD'),
    });

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

    writeFileTree(TMP_DIR, {
      [pluginDir(`plugin_a`)]: Plugins.invalid(),
      [pluginDir(`plugin_b`)]: Plugins.incomplete(),
      [pluginDir(`plugin_c`)]: Plugins.incompatible(),
      [pluginDir(`plugin_d`)]: Plugins.incompatibleType('pluginD'),
      [pluginDir(`plugin_ad`)]: Plugins.missingManifest(),
      [pluginDir(`plugin_e`)]: Plugins.missingOwnerAttribute(),
    });

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

  it('return errors when the plugin search path cannot be read', async () => {
    const { plugin$, error$ } = discover({
      config: new PluginsConfig(pluginConfig, env),
      coreContext,
      instanceInfo,
      nodeInfo,
    });

    writeFileTree(TMP_DIR, {
      [pluginDir('.')]: 'not a directory',
    });

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
        `Error: ENOTDIR: not a directory, scandir '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
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
        `Error: ENOENT: no such file or directory, scandir '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
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

    writeFileTree(TMP_DIR, {
      [pluginDir(`plugin_a`)]: {
        'kibana.json': JSON.stringify({ id: 'plugin', version: '1' }),
        nested_plugin: Plugins.valid('nestedPlugin'),
      },
    });
    const errorPath = manifestPath('plugin_a');
    mockReadFileErrors.set(
      errorPath,
      Object.assign(new Error(`EACCES: permission denied, open '${errorPath}'`), { code: 'EACCES' })
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
        `Error: EACCES: permission denied, open '${errorPath}' (missing-manifest, ${errorPath})`,
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

    writeFileTree(TMP_DIR, {
      [pluginDir(`plugin_a`)]: Plugins.valid('pluginA'),
      [pluginDir(`sub1/plugin_b`)]: Plugins.valid('pluginB'),
      [pluginDir(`sub1/sub2/plugin_c`)]: Plugins.valid('pluginC'),
      [pluginDir(`sub1/sub2/plugin_d`)]: Plugins.validPreboot('pluginD'),
      [pluginDir(`sub1/sub2/plugin_e`)]: Plugins.incomplete(),
    });

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

    writeFileTree(TMP_DIR, {
      [pluginDir(`plugin_a`)]: {
        ...Plugins.valid('pluginA'),
        nested_plugin: Plugins.valid('nestedPlugin'),
      },
    });

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

    writeFileTree(TMP_DIR, {
      [pluginDir(`sub1/plugin`)]: Plugins.valid('plugin1'),
      [pluginDir(`sub1/sub2/plugin`)]: Plugins.valid('plugin2'),
      [pluginDir(`sub1/sub2/sub3/plugin`)]: Plugins.valid('plugin3'),
      [pluginDir(`sub1/sub2/sub3/sub4/plugin`)]: Plugins.valid('plugin4'),
      [pluginDir(`sub1/sub2/sub3/sub4/sub5/plugin`)]: Plugins.valid('plugin5'),
      [pluginDir(`sub1/sub2/sub3/sub4/sub5/sub6/plugin`)]: Plugins.valid('plugin6'),
    });

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

    writeFileTree(TMP_DIR, {
      [pluginFolder]: {
        plugin_a: Plugins.valid('pluginA'),
        plugin_b: Plugins.valid('pluginB'),
        plugin_c: Plugins.validPreboot('pluginC'),
      },
    });
    symlinkSync(pluginFolder, pluginDir(`.`));

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
          allowlistPluginGroups: undefined,
          examples: false,
          oss: false,
          devOnly: true,
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

    it('does not filter if allowlistPluginGroups is not specified', async () => {
      const foo = getMockPackage('foo');
      const bar = getMockPackage('bar');
      const obs = getMockPackage('obs', 'observability');
      const sec = getMockPackage('sec', 'security');
      coreContext.env = {
        ...env,
        pluginSearchPaths: [],
        repoPackages: [foo, bar, obs, sec],
      };

      getPluginPackagesFilterMock.mockReturnValue(Boolean);

      const filteredPluginsConfig: PluginsConfigType = {
        ...pluginConfig,
        allowlistPluginGroups: undefined, // we make it explicit to illustrate the purpose of the test
      };

      const { plugin$ } = discover({
        config: new PluginsConfig(filteredPluginsConfig, coreContext.env),
        coreContext,
        instanceInfo,
        nodeInfo,
      });

      const plugins = await firstValueFrom(plugin$.pipe(toArray()));

      expect(plugins.length).toEqual(4);
      // plugin discovery sorts them by name
      expect(plugins[0].name).toEqual('bar');
      expect(plugins[1].name).toEqual('foo');
      expect(plugins[2].name).toEqual('obs');
      expect(plugins[3].name).toEqual('sec');
    });

    it('filters out plugins that do not belong to included groups', async () => {
      const foo = getMockPackage('foo');
      const bar = getMockPackage('bar');
      const obs = getMockPackage('obs', 'observability');
      const sec = getMockPackage('sec', 'security');
      coreContext.env = {
        ...env,
        pluginSearchPaths: [],
        repoPackages: [foo, bar, obs, sec],
      };

      const allowlistPluginGroups: KibanaGroup[] = ['platform', 'observability'];
      const filteredPluginsConfig: PluginsConfigType = {
        ...pluginConfig,
        allowlistPluginGroups,
      };

      getPluginPackagesFilterMock.mockImplementation(getPluginPackagesFilter);

      const { plugin$ } = discover({
        config: new PluginsConfig(filteredPluginsConfig, coreContext.env),
        coreContext,
        instanceInfo,
        nodeInfo,
      });

      const plugins = await firstValueFrom(plugin$.pipe(toArray()));

      expect(plugins.length).toEqual(3);
      // plugin discovery sorts them by name
      expect(plugins[0].name).toEqual('bar');
      expect(plugins[1].name).toEqual('foo');
      expect(plugins[2].name).toEqual('obs');
    });
  });

  describe('discovery order', () => {
    beforeEach(() => {
      scanPluginSearchPathsMock.mockClear();
      getPluginPackagesFilterMock.mockReturnValue(() => true);
    });

    it('returns the plugins in a deterministic order', async () => {
      writeFileTree(TMP_DIR, {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
        [`${KIBANA_ROOT}/plugins/plugin_b`]: Plugins.valid('pluginB'),
        [`${KIBANA_ROOT}/x-pack/plugins/plugin_c`]: Plugins.valid('pluginC'),
      });

      scanPluginSearchPathsMock.mockReturnValue(
        from([
          `${KIBANA_ROOT}/src/plugins/plugin_a`,
          `${KIBANA_ROOT}/plugins/plugin_b`,
          `${KIBANA_ROOT}/x-pack/plugins/plugin_c`,
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
          `${KIBANA_ROOT}/plugins/plugin_b`,
          `${KIBANA_ROOT}/x-pack/plugins/plugin_c`,
          `${KIBANA_ROOT}/src/plugins/plugin_a`,
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
