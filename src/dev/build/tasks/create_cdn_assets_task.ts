/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync } from 'fs';
import { access } from 'fs/promises';

import { resolve, dirname } from 'path';
import { asyncForEach } from '@kbn/std';
import { Jsonc } from '@kbn/repo-packages';

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

    await del(assets);
    await mkdirp(assets);

    // Plugins

    const plugins = globby.sync([`${buildSource}/node_modules/@kbn/**/*/kibana.jsonc`]);
    await asyncForEach(plugins, async (path) => {
      const manifest = Jsonc.parse(readFileSync(path, 'utf8')) as any;
      if (manifest?.plugin?.id) {
        const pluginRoot = resolve(dirname(path));

        try {
          // packages/core/plugins/core-plugins-server-internal/src/plugins_service.ts
          const assetsSource = resolve(pluginRoot, 'assets');
          const assetsDest = resolve('plugins', manifest.plugin.id, 'assets');
          await access(assetsSource);
          await mkdirp(assetsDest);
          await copyAll(assetsSource, assetsDest);
        } catch (e) {
          // assets are optional
          if (!(e.code === 'ENOENT' && e.syscall === 'access')) throw e;
        }

        try {
          // packages/core/apps/core-apps-server-internal/src/bundle_routes/register_bundle_routes.ts
          const bundlesSource = resolve(pluginRoot, 'target', 'public');
          const bundlesDest = resolve(bundles, 'plugin', manifest.plugin.id, '1.0.0');
          await access(bundlesSource);
          await mkdirp(bundlesDest);
          await copyAll(bundlesSource, bundlesDest);
        } catch (e) {
          // bundles are optional
          if (!(e.code === 'ENOENT' && e.syscall === 'access')) throw e;
        }
      }
    });

    // packages/core/apps/core-apps-server-internal/src/bundle_routes/register_bundle_routes.ts
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/ui-shared-deps-npm/shared_built_assets'),
      resolve(bundles, 'kbn-ui-shared-deps-npm')
    );
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/ui-shared-deps-src/shared_built_assets'),
      resolve(bundles, 'kbn-ui-shared-deps-src')
    );
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/core/target/public'),
      resolve(bundles, 'core')
    );
    await copyAll(resolve(buildSource, 'node_modules/@kbn/monaco'), resolve(bundles, 'kbn-monaco'));

    // packages/core/apps/core-apps-server-internal/src/core_app.ts
    await copyAll(
      resolve(buildSource, 'node_modules/@kbn/core-apps-server-internal/assets'),
      resolve(assets, 'ui')
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
