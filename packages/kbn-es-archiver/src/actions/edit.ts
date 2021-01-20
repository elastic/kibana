/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve, relative } from 'path';
import Fs from 'fs';
import { createGunzip, createGzip, Z_BEST_COMPRESSION } from 'zlib';
import { promisify } from 'util';
import globby from 'globby';
import { ToolingLog } from '@kbn/dev-utils';
import { createPromiseFromStreams } from '@kbn/utils';

const unlinkAsync = promisify(Fs.unlink);

export async function editAction({
  prefix,
  dataDir,
  log,
  handler,
}: {
  prefix: string;
  dataDir: string;
  log: ToolingLog;
  handler: () => Promise<any>;
}) {
  const archives = (
    await globby('**/*.gz', {
      cwd: prefix ? resolve(dataDir, prefix) : dataDir,
      absolute: true,
    })
  ).map((path) => ({
    path,
    rawPath: path.slice(0, -3),
  }));

  await Promise.all(
    archives.map(async (archive) => {
      await createPromiseFromStreams([
        Fs.createReadStream(archive.path),
        createGunzip(),
        Fs.createWriteStream(archive.rawPath),
      ]);

      await unlinkAsync(archive.path);

      log.info(
        `Extracted %s to %s`,
        relative(process.cwd(), archive.path),
        relative(process.cwd(), archive.rawPath)
      );
    })
  );

  await handler();

  await Promise.all(
    archives.map(async (archive) => {
      await createPromiseFromStreams([
        Fs.createReadStream(archive.rawPath),
        createGzip({ level: Z_BEST_COMPRESSION }),
        Fs.createWriteStream(archive.path),
      ]);

      await unlinkAsync(archive.rawPath);

      log.info(
        `Archived %s to %s`,
        relative(process.cwd(), archive.rawPath),
        relative(process.cwd(), archive.path)
      );
    })
  );
}
