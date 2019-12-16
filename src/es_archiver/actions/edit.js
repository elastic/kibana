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

import { resolve, relative } from 'path';
import Fs from 'fs';
import { createGunzip, createGzip, Z_BEST_COMPRESSION } from 'zlib';
import { promisify } from 'util';
import globby from 'globby';

import { createPromiseFromStreams } from '../../legacy/utils';

const unlinkAsync = promisify(Fs.unlink);

export async function editAction({ prefix, dataDir, log, handler }) {
  const archives = (
    await globby('**/*.gz', {
      cwd: prefix ? resolve(dataDir, prefix) : dataDir,
      absolute: true,
    })
  ).map(path => ({
    path,
    rawPath: path.slice(0, -3),
  }));

  await Promise.all(
    archives.map(async archive => {
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
    archives.map(async archive => {
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
