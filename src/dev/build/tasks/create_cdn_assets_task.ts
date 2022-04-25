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
    await mkdirp(plugin);

    const plugins = globby.sync([
      `${buildSource}/x-pack/plugins/*/kibana.json`,
      `${buildSource}/src/plugins/*/kibana.json`,
    ]);
    asyncForEach(plugins, async (path) => {
      const spec = JSON.parse(readFileSync(path, 'utf8'));
      const { id, version } = spec;
      const dest = resolve(plugin, id, version);
      await copyAll(resolve(dirname(path), 'target/public'), dest, {
        select: ['*'],
      });
    });
    await compressTar({
      source: assets,
      destination: config.resolveFromTarget(`kibana-${buildVersion}F*}-cdn-assets.tar.gz`),
      archiverOptions: {
        gzip: true,
        gzipOptions: {
          level: 9,
        },
      },
      createRootDirectory: false,
    });
  },
};
