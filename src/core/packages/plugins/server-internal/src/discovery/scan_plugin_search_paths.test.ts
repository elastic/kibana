/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { mkdirSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { toArray } from 'rxjs';
import { writeFileTree } from '../test_helpers/file_tree';
import { scanPluginSearchPaths } from './scan_plugin_search_paths';
import type { PluginDiscoveryError } from './plugin_discovery_error';
import { firstValueFrom } from 'rxjs';

const TMP_DIR = join(tmpdir(), `scan-plugin-search-paths-${randomUUID()}`);
const KIBANA_ROOT = join(TMP_DIR, 'kibana');

const Plugins = {
  missingManifest: () => ({}),
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
    mkdirSync(TMP_DIR, { mode: 0o700 });
    logger = loggingSystemMock.createLogger();
  });

  afterEach(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
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
    writeFileTree(TMP_DIR, {
      [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
      [`${KIBANA_ROOT}/plugins/plugin_b`]: Plugins.valid('pluginB'),
      [`${KIBANA_ROOT}/x-pack/plugins/plugin_c`]: Plugins.valid('pluginC'),
    });

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
    writeFileTree(TMP_DIR, {
      [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
      [`${KIBANA_ROOT}/src/plugins/plugin_b`]: Plugins.missingManifest(),
    });

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(paths).toHaveLength(1);
    expect(errors).toHaveLength(0);

    expect(paths).toEqual([`${KIBANA_ROOT}/src/plugins/plugin_a`]);
  });

  it('return errors when the plugin search path cannot be read', async () => {
    writeFileTree(TMP_DIR, {
      [`${KIBANA_ROOT}/src/plugins`]: 'not a directory',
    });

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(paths).toHaveLength(0);
    expect(errors).toHaveLength(1);

    const srcPluginsPath = resolve(KIBANA_ROOT, 'src', 'plugins');
    expect(errors.map((e) => e.toString())).toEqual(
      expect.arrayContaining([
        `Error: ENOTDIR: not a directory, scandir '${srcPluginsPath}' (invalid-search-path, ${srcPluginsPath})`,
      ])
    );
  });

  it('discovers plugins in nested directories', async () => {
    writeFileTree(TMP_DIR, {
      [`${KIBANA_ROOT}/src/plugins/plugin_a`]: Plugins.valid('pluginA'),
      [`${KIBANA_ROOT}/src/plugins/sub1/plugin_b`]: Plugins.valid('pluginB'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_c`]: Plugins.valid('pluginC'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_d`]: Plugins.valid('pluginD'),
    });

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(4);

    expect(paths).toEqual(
      expect.arrayContaining([
        `${KIBANA_ROOT}/src/plugins/plugin_a`,
        `${KIBANA_ROOT}/src/plugins/sub1/plugin_b`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_c`,
        `${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin_d`,
      ])
    );
  });

  it('does not discover plugins nested inside another plugin', async () => {
    writeFileTree(TMP_DIR, {
      [`${KIBANA_ROOT}/src/plugins/plugin_a`]: {
        ...Plugins.valid('pluginA'),
        nested_plugin: Plugins.valid('nestedPlugin'),
      },
    });

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/src/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(1);

    expect(paths).toEqual([`${KIBANA_ROOT}/src/plugins/plugin_a`]);
  });

  it('stops scanning when reaching `maxDepth`', async () => {
    writeFileTree(TMP_DIR, {
      [`${KIBANA_ROOT}/src/plugins/sub1/plugin`]: Plugins.valid('plugin1'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/plugin`]: Plugins.valid('plugin2'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/plugin`]: Plugins.valid('plugin3'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/plugin`]: Plugins.valid('plugin4'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/plugin`]: Plugins.valid('plugin5'),
      [`${KIBANA_ROOT}/src/plugins/sub1/sub2/sub3/sub4/sub5/sub6/plugin`]: Plugins.valid('plugin6'),
    });

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

    writeFileTree(TMP_DIR, {
      [pluginFolder]: {
        plugin_a: Plugins.valid('pluginA'),
        plugin_b: Plugins.valid('pluginB'),
      },
    });
    mkdirSync(KIBANA_ROOT);
    symlinkSync('../ext-plugins', `${KIBANA_ROOT}/plugins`);

    const pluginOrErrors$ = scanPluginSearchPaths([`${KIBANA_ROOT}/plugins`], logger);
    const { paths, errors } = extract(await firstValueFrom(pluginOrErrors$.pipe(toArray())));

    expect(errors).toHaveLength(0);
    expect(paths).toHaveLength(2);

    expect(paths).toEqual(
      expect.arrayContaining([`${KIBANA_ROOT}/plugins/plugin_a`, `${KIBANA_ROOT}/plugins/plugin_b`])
    );
  });
});
