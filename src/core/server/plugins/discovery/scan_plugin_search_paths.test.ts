/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import mockFs from 'mock-fs';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { toArray } from 'rxjs/operators';
import { resolve } from 'path';
import { scanPluginSearchPaths } from './scan_plugin_search_paths';
import { PluginDiscoveryError } from './plugin_discovery_error';
import { firstValueFrom } from 'rxjs';

const KIBANA_ROOT = process.cwd();

const Plugins = {
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

const scanPaths = [
  `${KIBANA_ROOT}/src/plugins`,
  `${KIBANA_ROOT}/plugins`,
  `${KIBANA_ROOT}/x-pack/plugins`,
];

describe('scanPluginSearchPaths', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    logger = loggingSystemMock.createLogger();

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

  const extract = (
    pathOrErrors: Array<string | PluginDiscoveryError>
  ): { paths: string[]; errors: PluginDiscoveryError[] } => {
    return {
      paths: pathOrErrors.filter((e) => typeof e === 'string') as string[],
      errors: pathOrErrors.filter((e) => typeof e !== 'string') as PluginDiscoveryError[],
    };
  };

  it('discovers plugins in the search locations', async () => {
    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
        [`${KIBANA_ROOT}/plugins/plugin_b`]: Plugins.valid('pluginB'),
        [`${KIBANA_ROOT}/x-pack/plugins/plugin_c`]: Plugins.valid('pluginC'),
      },
      { createCwd: false }
    );

    const pluginOrErrors$ = scanPluginSearchPaths(scanPaths, logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(paths).toHaveLength(3);
    expect(errors).toHaveLength(0);

    expect(paths).toEqual(
      expect.arrayContaining([
        `${KIBANA_ROOT}/src/plugins/plugin_a`,
        `${KIBANA_ROOT}/plugins/plugin_b`,
        `${KIBANA_ROOT}/x-pack/plugins/plugin_c`,
      ])
    );
  });

  it('ignores folder if the manifest is missing', async () => {
    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
        [`${KIBANA_ROOT}/src/plugins/plugin_b`]: Plugins.missingManifest(),
      },
      { createCwd: false }
    );

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(paths).toHaveLength(1);
    expect(errors).toHaveLength(0);

    expect(paths).toEqual([`${KIBANA_ROOT}/src/plugins/plugin_a`]);
  });

  it('return errors when the plugin search path is not accessible', async () => {
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

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(paths).toHaveLength(0);
    expect(errors).toHaveLength(1);

    const srcPluginsPath = resolve(KIBANA_ROOT, 'src', 'plugins');
    expect(errors.map((e) => e.toString())).toEqual(
      expect.arrayContaining([
        `Error: EACCES, permission denied '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
      ])
    );
  });

  it('discovers plugins in nested directories', async () => {
    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
        [`${KIBANA_ROOT}/src/plugins/sub1/plugin_b`]: Plugins.valid('pluginB'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_c`]: Plugins.valid('pluginC'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_d`]: Plugins.valid('pluginD'),
      },
      { createCwd: false }
    );

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(4);

    expect(paths).toEqual(
      expect.objectContaining([
        `${KIBANA_ROOT}/src/plugins/plugin_a`,
        `${KIBANA_ROOT}/src/plugins/sub1/plugin_b`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_c`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_d`,
      ])
    );
  });

  it('does not discover plugins nested inside another plugin', async () => {
    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/plugin_a`]: {
          ...Plugins.valid('pluginA'),
          nested_plugin: Plugins.valid('nestedPlugin'),
        },
      },
      { createCwd: false }
    );

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(1);

    expect(paths).toEqual([`${KIBANA_ROOT}/src/plugins/plugin_a`]);
  });

  it('stops scanning when reaching `maxDepth`', async () => {
    mockFs(
      {
        [`${KIBANA_ROOT}/src/plugins/sub1/plugin`]: Plugins.valid('plugin1'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin`]: Plugins.valid('plugin2'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/plugin`]: Plugins.valid('plugin3'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/plugin`]: Plugins.valid('plugin4'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/plugin`]: Plugins.valid('plugin5'),
        [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/sub6/plugin`]:
          Plugins.valid('plugin6'),
      },
      { createCwd: false }
    );

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(5);

    expect(paths).toEqual(
      expect.arrayContaining([
        `${KIBANA_ROOT}/src/plugins/sub1/plugin`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/plugin`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/plugin`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/plugin`,
      ])
    );
  });

  it('works with symlinks', async () => {
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

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(2);

    expect(paths).toEqual(
      expect.arrayContaining([`${KIBANA_ROOT}/plugins/plugin_a`, `${KIBANA_ROOT}/plugins/plugin_b`])
    );
  });
});
