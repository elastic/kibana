/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import { createHash } from 'crypto';
import * as Rx from 'rxjs';
import globby from 'globby';
import { Task } from '../lib';

const read$ = Rx.bindNodeCallback(Fs.readFile);

async function readToEntries(iter: NodeJS.ReadableStream): Promise<Array<[string, string]>> {
  return await Rx.lastValueFrom(
    (Rx.from(iter) as Rx.Observable<string>).pipe(
      Rx.mergeMap(
        (path) =>
          read$(path).pipe(
            Rx.map((content): [string, string] => [
              path,
              createHash('sha1').update(content).digest('hex'),
            ])
          ),
        50
      ),
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

      const [pkgEntries, fileEntries] = await Promise.all([
        readToEntries(
          globby.stream(['node_modules/*/package.json', 'node_modules/@*/*/package.json'], {
            cwd: dir,
            onlyFiles: true,
            absolute: false,
          })
        ),
        readToEntries(
          globby.stream(['**/*'], {
            ignore: ['node_modules'],
            cwd: dir,
            onlyFiles: true,
            absolute: false,
          })
        ),
      ]);

      Fs.writeFileSync(
        dest,
        [
          `dist checksum: ${platform.getBuildName()}`,
          '',
          `root level pkgs:`,
          ...pkgEntries.map(([path, checksum]) => {
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
          ...fileEntries.map(([path, checksum]) => `  ${path}: ${checksum}`),
        ].join('\n')
      );
    }
  },
};
