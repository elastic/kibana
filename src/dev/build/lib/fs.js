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

import fs from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname, isAbsolute } from 'path';
import { createGunzip } from 'zlib';
import { inspect } from 'util';

import vfs from 'vinyl-fs';
import { promisify } from 'bluebird';
import mkdirpCb from 'mkdirp';
import del from 'del';
import { createPromiseFromStreams, createMapStream } from '../../../utils';

import { Extract } from 'tar';

const mkdirpAsync = promisify(mkdirpCb);
const statAsync = promisify(fs.stat);
const chmodAsync = promisify(fs.chmod);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const utimesAsync = promisify(fs.utimes);

export function assertAbsolute(path) {
  if (!isAbsolute(path)) {
    throw new TypeError(
      'Please use absolute paths to keep things explicit. You probably want to use `build.resolvePath()` or `config.resolveFromRepo()`.'
    );
  }
}

function longInspect(value) {
  return inspect(value, {
    maxArrayLength: Infinity
  });
}

export async function mkdirp(path) {
  assertAbsolute(path);
  await mkdirpAsync(path);
}

export async function write(path, contents) {
  assertAbsolute(path);
  await mkdirp(dirname(path));
  await writeFileAsync(path, contents);
}

export async function read(path) {
  assertAbsolute(path);
  return await readFileAsync(path, 'utf8');
}

export async function getChildPaths(path) {
  assertAbsolute(path);
  const childNames = await readdirAsync(path);
  return childNames.map(name => resolve(path, name));
}

export async function copy(source, destination) {
  assertAbsolute(source);
  assertAbsolute(destination);

  const stat = await statAsync(source);

  // mkdirp after the stat(), stat will throw if source
  // doesn't exist and ideally we won't create the parent directory
  // unless the source exists
  await mkdirp(dirname(destination));

  await createPromiseFromStreams([
    fs.createReadStream(source),
    fs.createWriteStream(destination),
  ]);

  await chmodAsync(destination, stat.mode);
}

export async function deleteAll(log, patterns) {
  if (!Array.isArray(patterns)) {
    throw new TypeError('Expected patterns to be an array');
  }

  log.debug('Deleting patterns:', longInspect(patterns));

  for (const pattern of patterns) {
    assertAbsolute(pattern.startsWith('!') ? pattern.slice(1) : pattern);
  }

  const files = await del(patterns, {
    concurrency: 4
  });
  log.debug('Deleted %d files/directories', files.length);
  log.verbose('Deleted:', longInspect(files));
}

export async function copyAll(sourceDir, destination, options = {}) {
  const {
    select = ['**/*'],
    dot = false,
    time,
  } = options;

  assertAbsolute(sourceDir);
  assertAbsolute(destination);

  await createPromiseFromStreams([
    vfs.src(select, {
      buffer: false,
      cwd: sourceDir,
      base: sourceDir,
      dot,
    }),
    vfs.dest(destination)
  ]);

  // we must update access and modified file times after the file copy
  // has completed, otherwise the copy action can effect modify times.
  if (Boolean(time)) {
    await createPromiseFromStreams([
      vfs.src(select, {
        buffer: false,
        cwd: destination,
        base: destination,
        dot,
      }),
      createMapStream(file => utimesAsync(file.path, time, time))
    ]);
  }
}

export async function getFileHash(path, algo) {
  assertAbsolute(path);

  const hash = createHash(algo);
  const readStream = fs.createReadStream(path);
  await new Promise((resolve, reject) => {
    readStream
      .on('data', chunk => hash.update(chunk))
      .on('error', reject)
      .on('end', resolve);
  });

  return hash.digest('hex');
}

export async function untar(source, destination, extractOptions = {}) {
  assertAbsolute(source);
  assertAbsolute(destination);

  await createPromiseFromStreams([
    fs.createReadStream(source),
    createGunzip(),
    new Extract({
      ...extractOptions,
      path: destination
    }),
  ]);
}
