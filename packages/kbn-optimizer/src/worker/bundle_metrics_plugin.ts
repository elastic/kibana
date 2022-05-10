/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { CiStatsMetric } from '@kbn/ci-stats-reporter';

import { Bundle } from '../common';

interface Asset {
  name: string;
  size: number;
}

const IGNORED_EXTNAME = ['.map', '.br', '.gz'];

export class BundleMetricsPlugin {
  constructor(private readonly bundle: Bundle) {}

  public apply(compiler: webpack.Compiler) {
    const { bundle } = this;

    compiler.hooks.emit.tap('BundleMetricsPlugin', (compilation) => {
      const assets = Object.entries(compilation.assets)
        .map(
          ([name, source]: [string, any]): Asset => ({
            name,
            size: source.size(),
          })
        )
        .filter((asset) => {
          const filename = Path.basename(asset.name);
          if (filename.startsWith('.')) {
            return false;
          }

          const ext = Path.extname(filename);
          if (IGNORED_EXTNAME.includes(ext)) {
            return false;
          }

          return true;
        });

      const entryName = `${bundle.id}.${bundle.type}.js`;
      const entry = assets.find((a) => a.name === entryName);
      if (!entry) {
        throw new Error(
          `Unable to find bundle entry named [${entryName}] in [${bundle.outputDir}]`
        );
      }

      const chunkPrefix = `${bundle.id}.chunk.`;
      const asyncChunks = assets.filter((a) => a.name.startsWith(chunkPrefix));
      const miscFiles = assets.filter((a) => a !== entry && !asyncChunks.includes(a));

      const sumSize = (files: Asset[]) => files.reduce((acc: number, a) => acc + a.size, 0);

      const moduleCount = bundle.cache.getModuleCount();
      if (moduleCount === undefined) {
        throw new Error(`moduleCount wasn't populated by PopulateBundleCachePlugin`);
      }

      const bundleMetrics: CiStatsMetric[] = [
        {
          group: `@kbn/optimizer bundle module count`,
          id: bundle.id,
          value: moduleCount,
        },
        {
          group: `page load bundle size`,
          id: bundle.id,
          value: entry.size,
          limit: bundle.pageLoadAssetSizeLimit,
          limitConfigPath: `node_modules/@kbn/optimizer/limits.yml`,
        },
        {
          group: `async chunks size`,
          id: bundle.id,
          value: sumSize(asyncChunks),
        },
        {
          group: `async chunk count`,
          id: bundle.id,
          value: asyncChunks.length,
        },
        {
          group: `miscellaneous assets size`,
          id: bundle.id,
          value: sumSize(miscFiles),
        },
      ];

      const metricsSource = new RawSource(JSON.stringify(bundleMetrics, null, 2));

      // see https://github.com/jantimon/html-webpack-plugin/blob/33d69f49e6e9787796402715d1b9cd59f80b628f/index.js#L266
      // @ts-expect-error undocumented, used to add assets to the output
      compilation.emitAsset('metrics.json', metricsSource);
    });
  }
}
