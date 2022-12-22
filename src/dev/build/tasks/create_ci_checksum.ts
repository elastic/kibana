/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Fsp from 'fs/promises';
import Path from 'path';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import * as Rx from 'rxjs';
import globby from 'globby';
import { Task } from '../lib';

const readToVersion = (baseDir: string) => async (path: string) => {
  try {
    const content = await Fsp.readFile(Path.resolve(baseDir, path), 'utf8');
    const parsed = JSON.parse(content);
    return parsed.version || 'missing version field';
  } catch (error) {
    throw new Error(`failed to parse package.json file at [${path}]: ${error.message}`);
  }
};

const readToHash = (baseDir: string) => async (path: string) => {
  const hash = createHash('sha1');
  await pipeline(Fs.createReadStream(Path.resolve(baseDir, path)), hash);
  return hash.digest('hex');
};

async function readToEntries(
  iter: NodeJS.ReadableStream,
  map: (path: string) => Promise<string>
): Promise<Array<[string, string]>> {
  return await Rx.lastValueFrom(
    (Rx.from(iter) as Rx.Observable<string>).pipe(
      Rx.mergeMap(async (path): Promise<[string, string]> => [path, await map(path)], 50),
      Rx.toArray(),
      Rx.map((entries) => entries.sort((a, b) => a[0].localeCompare(b[0])))
    )
  );
}

export const CreateCiChecksum: Task = {
  description: 'determining CI checksum of build',
  async run(config, log, build) {
    for (const platform of config.getTargetPlatforms()) {
      const dir = build.resolvePathForPlatform(platform, '.');
      const dest = build.getPlatformArchivePath(platform) + `.ci-checksum`;

      const [npmEntries, pkgEntries, srcEntries] = await Promise.all([
        readToEntries(
          globby.stream(['node_modules/*/package.json', 'node_modules/@*/*/package.json'], {
            ignore: ['node_modules/@kbn'],
            cwd: dir,
            onlyFiles: true,
            absolute: false,
          }),
          readToVersion(dir)
        ),
        readToEntries(
          globby.stream(['**/*'], {
            ignore: ['node_modules'],
            cwd: Path.resolve(dir, 'node_modules/@kbn'),
            onlyFiles: true,
            absolute: false,
          }),
          readToHash(Path.resolve(dir, 'node_modules/@kbn'))
        ),
        readToEntries(
          globby.stream(['**/*'], {
            ignore: ['node_modules', 'node'],
            cwd: dir,
            onlyFiles: true,
            absolute: false,
          }),
          readToHash(dir)
        ),
      ]);

      Fs.writeFileSync(
        dest,
        [
          `dist checksum: ${platform.getBuildName()}`,
          '',
          `root level pkgs:`,
          ...npmEntries.map(([path, checksum]) => {
            const segs = path.split('/');
            const i = segs.indexOf('node_modules');
            if (i === -1) {
              throw new Error(`pkgEntry has no node_modules seg ${path}/${checksum}`);
            }

            const name = segs[i + 1].startsWith('@')
              ? `${segs[i + 1]}/${segs[i + 2]}`
              : `${segs[i + 1]}`;

            return `  ${name}: ${checksum}`;
          }),
          ``,
          `files:`,
          ...pkgEntries.concat(srcEntries).map(([path, checksum]) => `  ${path}: ${checksum}`),
        ].join('\n')
      );
    }
  },
};
