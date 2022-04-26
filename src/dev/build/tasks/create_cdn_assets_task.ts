/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { asyncForEach } from '@kbn/std';

import del from 'del';
import globby from 'globby';

import { mkdirp, compressTar, Task, copyAll } from '../lib';

export const CreateCdnAssets: Task = {
  description: 'Creating CDN assets',

  async run(config, log, build) {
    const buildSource = build.resolvePath();
    const buildNum = config.getBuildNumber();
    const buildVersion = config.getBuildVersion();
    const assets = config.resolveFromRepo('build', 'cdn-assets');
    const bundles = resolve(assets, String(buildNum), 'bundles');
    const plugin = resolve(bundles, 'plugin');

    await del(assets);
    await mkdirp(assets);

    // Plugins
    await mkdirp(plugin);
    const plugins = globby.sync([
      `${buildSource}/x-pack/plugins/**/kibana.json`,
      `${buildSource}/src/plugins/**/kibana.json`,
    ]);
    asyncForEach(plugins, async (path) => {
      const spec = JSON.parse(readFileSync(path, 'utf8'));
      const { id, version } = spec;
      const dest = resolve(plugin, id, version);
      await copyAll(resolve(dirname(path), 'target/public'), dest);
    });

    // Core
    await copyAll(resolve(buildSource, 'src/core/target/public'), resolve(bundles, 'core'));
    await copyAll(resolve(buildSource, 'src/core/server/core_app/assets'), resolve(assets, 'ui'));

    // Shared dependencies
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/ui-shared-deps-npm/shared_built_assets'),
      resolve(bundles, 'kbn-ui-shared-deps-npm')
    );
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/ui-shared-deps-src/shared_built_assets'),
      resolve(bundles, 'kbn-ui-shared-deps-src')
    );
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/ui-framework/dist'),
      resolve(assets, 'node_modules/@kbn/ui-framework/dist')
    );

    await compressTar({
      source: assets,
      destination: config.resolveFromTarget(`kibana-${buildVersion}-cdn-assets.tar.gz`),
      archiverOptions: {
        gzip: true,
        gzipOptions: {
          level: 9,
        },
      },
      createRootDirectory: true,
      rootDirectoryName: `kibana-${buildVersion}-cdn-assets`,
    });
  },
};
