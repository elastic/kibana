/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Fs from 'fs';
import Path from 'path';

import { ToolingLog, CiStatsMetrics } from '@kbn/dev-utils';
import { OptimizerConfig } from './optimizer_config';

const flatten = <T>(arr: Array<T | T[]>): T[] =>
  arr.reduce((acc: T[], item) => acc.concat(item), []);

interface Entry {
  relPath: string;
  stats: Fs.Stats;
}

const IGNORED_EXTNAME = ['.map', '.br', '.gz'];

const getFiles = (dir: string, parent?: string) =>
  flatten(
    Fs.readdirSync(dir).map((name): Entry | Entry[] => {
      const absPath = Path.join(dir, name);
      const relPath = parent ? Path.join(parent, name) : name;
      const stats = Fs.statSync(absPath);

      if (stats.isDirectory()) {
        return getFiles(absPath, relPath);
      }

      return {
        relPath,
        stats,
      };
    })
  ).filter((file) => {
    const filename = Path.basename(file.relPath);
    if (filename.startsWith('.')) {
      return false;
    }

    const ext = Path.extname(filename);
    if (IGNORED_EXTNAME.includes(ext)) {
      return false;
    }

    return true;
  });

export function getMetrics(log: ToolingLog, config: OptimizerConfig) {
  return flatten(
    config.bundles.map((bundle) => {
      // make the cache read from the cache file since it was likely updated by the worker
      bundle.cache.refresh();

      const outputFiles = getFiles(bundle.outputDir);
      const entryName = `${bundle.id}.${bundle.type}.js`;
      const entry = outputFiles.find((f) => f.relPath === entryName);
      if (!entry) {
        throw new Error(
          `Unable to find bundle entry named [${entryName}] in [${bundle.outputDir}]`
        );
      }

      const chunkPrefix = `${bundle.id}.chunk.`;
      const asyncChunks = outputFiles.filter((f) => f.relPath.startsWith(chunkPrefix));
      const miscFiles = outputFiles.filter((f) => f !== entry && !asyncChunks.includes(f));

      if (asyncChunks.length) {
        log.verbose(bundle.id, 'async chunks', asyncChunks);
      }
      if (miscFiles.length) {
        log.verbose(bundle.id, 'misc files', asyncChunks);
      }

      const sumSize = (files: Entry[]) => files.reduce((acc: number, f) => acc + f.stats!.size, 0);

      const bundleMetrics: CiStatsMetrics = [
        {
          group: `@kbn/optimizer bundle module count`,
          id: bundle.id,
          value: bundle.cache.getModuleCount() || 0,
        },
        {
          group: `page load bundle size`,
          id: bundle.id,
          value: entry.stats!.size,
          limit: config.limits.pageLoadAssetSize?.[bundle.id],
          limitConfigPath: `packages/kbn-optimizer/limits.yml`,
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

      log.debug(bundle.id, 'metrics', bundleMetrics);

      return bundleMetrics;
    })
  );
}
