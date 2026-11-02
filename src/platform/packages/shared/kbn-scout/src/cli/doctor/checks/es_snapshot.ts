/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getSnapshotCacheFilename } from '@kbn/es';
import type { DoctorCheckGroup } from '../types';
import { pass, warn } from '../types';
import { formatAge, formatBytes } from '../utils';

const CACHE_DIR = Path.resolve(REPO_ROOT, '.es/cache');

const getKibanaVersion = async (): Promise<string> =>
  JSON.parse(await Fs.promises.readFile(Path.resolve(REPO_ROOT, 'package.json'), 'utf8')).version;

const readCacheDir = async () =>
  (await Fs.promises.readdir(CACHE_DIR).catch(() => [])).filter(
    (file) => file.startsWith('elasticsearch-') && !file.endsWith('.meta')
  );

export const esSnapshotChecks: DoctorCheckGroup = {
  title: 'Elasticsearch snapshot',
  checks: [
    {
      title: 'Cached snapshot',
      run: async () => {
        const version = await getKibanaVersion();
        const filename = getSnapshotCacheFilename(version);
        const path = Path.join(CACHE_DIR, filename);
        const stats = await Fs.promises.stat(path).catch(() => undefined);
        if (!stats) {
          return warn(
            `Elasticsearch ${version}-SNAPSHOT is not cached`,
            'start-server downloads it on the first run (~600 MB)'
          );
        }

        // kbn-es stores the download time next to the archive
        const meta = await Fs.promises.readFile(`${path}.meta`, 'utf8').catch(() => undefined);
        const downloadedAt = meta ? new Date(JSON.parse(meta).ts) : stats.mtime;
        return pass(
          `${filename.replace(/\.(tar\.gz|zip)$/, '')} downloaded ${formatAge(
            downloadedAt
          )} · ${formatBytes(stats.size)}`
        );
      },
    },
    {
      title: 'Other cached snapshots',
      run: async () => {
        const current = getSnapshotCacheFilename(await getKibanaVersion());
        const others = (await readCacheDir()).filter((file) => file !== current);
        if (!others.length) {
          return pass('No snapshots for other versions in cache');
        }

        const sizes = await Promise.all(
          others.map(async (file) => (await Fs.promises.stat(Path.join(CACHE_DIR, file))).size)
        );
        const versions = others.map(
          (file) => file.match(/^elasticsearch-(.+?)-SNAPSHOT/)?.[1] ?? file
        );
        return warn(
          `Snapshots for ${versions.join(', ')} use ${formatBytes(
            sizes.reduce((a, b) => a + b, 0)
          )}`,
          `Remove them from ${CACHE_DIR} if no other branch needs them`
        );
      },
    },
  ],
};
