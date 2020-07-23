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
import { pipeline, Writable } from 'stream';
import { resolve, dirname, isAbsolute, sep } from 'path';
import { createGunzip } from 'zlib';
import { inspect, promisify } from 'util';

import archiver from 'archiver';
import vfs from 'vinyl-fs';
import File from 'vinyl';
import del from 'del';
import deleteEmpty from 'delete-empty';
import tar, { ExtractOptions } from 'tar';
import { ToolingLog } from '@kbn/dev-utils';

const pipelineAsync = promisify(pipeline);
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const utimesAsync = promisify(fs.utimes);
const copyFileAsync = promisify(fs.copyFile);
const statAsync = promisify(fs.stat);

export function assertAbsolute(path: string) {
  if (!isAbsolute(path)) {
    throw new TypeError(
      'Please use absolute paths to keep things explicit. You probably want to use `build.resolvePath()` or `config.resolveFromRepo()`.'
    );
  }
}

export function isFileAccessible(path: string) {
  assertAbsolute(path);

  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

function longInspect(value: any) {
  return inspect(value, {
    maxArrayLength: Infinity,
  });
}

export async function mkdirp(path: string) {
  assertAbsolute(path);
  await mkdirAsync(path, { recursive: true });
}

export async function write(path: string, contents: string) {
  assertAbsolute(path);
  await mkdirp(dirname(path));
  await writeFileAsync(path, contents);
}

export async function read(path: string) {
  assertAbsolute(path);
  return await readFileAsync(path, 'utf8');
}

export async function getChildPaths(path: string) {
  assertAbsolute(path);
  const childNames = await readdirAsync(path);
  return childNames.map((name) => resolve(path, name));
}

export async function deleteAll(patterns: string[], log: ToolingLog) {
  if (!Array.isArray(patterns)) {
    throw new TypeError('Expected patterns to be an array');
  }

  if (log) {
    log.debug('Deleting patterns:', longInspect(patterns));
  }

  for (const pattern of patterns) {
    assertAbsolute(pattern.startsWith('!') ? pattern.slice(1) : pattern);
  }

  const files = await del(patterns, {
    concurrency: 4,
  });

  if (log) {
    log.debug('Deleted %d files/directories', files.length);
    log.verbose('Deleted:', longInspect(files));
  }
}

export async function deleteEmptyFolders(
  log: ToolingLog,
  rootFolderPath: string,
  foldersToKeep: string[]
) {
  if (typeof rootFolderPath !== 'string') {
    throw new TypeError('Expected root folder to be a string path');
  }

  log.debug(
    'Deleting all empty folders and their children recursively starting on ',
    rootFolderPath
  );
  assertAbsolute(rootFolderPath.startsWith('!') ? rootFolderPath.slice(1) : rootFolderPath);

  // Delete empty is used to gather all the empty folders and
  // then we use del to actually delete them
  const emptyFoldersList = await deleteEmpty(rootFolderPath, {
    // @ts-expect-error DT package has incorrect types https://github.com/jonschlinkert/delete-empty/blob/6ae34547663e6845c3c98b184c606fa90ef79c0a/index.js#L160
    dryRun: true,
  });

  const foldersToDelete = emptyFoldersList.filter((folderToDelete) => {
    return !foldersToKeep.some((folderToKeep) => folderToDelete.includes(folderToKeep));
  });
  const deletedEmptyFolders = await del(foldersToDelete, {
    concurrency: 4,
  });

  log.debug('Deleted %d empty folders', deletedEmptyFolders.length);
  log.verbose('Deleted:', longInspect(deletedEmptyFolders));
}

interface CopyOptions {
  clone?: boolean;
}
export async function copy(source: string, destination: string, options: CopyOptions = {}) {
  assertAbsolute(source);
  assertAbsolute(destination);

  // ensure source exists before creating destination directory and copying source
  await statAsync(source);
  await mkdirp(dirname(destination));
  return await copyFileAsync(
    source,
    destination,
    options.clone ? fs.constants.COPYFILE_FICLONE : 0
  );
}

interface CopyAllOptions {
  select?: string[];
  dot?: boolean;
  time?: string | number | Date;
}

export async function copyAll(
  sourceDir: string,
  destination: string,
  options: CopyAllOptions = {}
) {
  const { select = ['**/*'], dot = false, time = Date.now() } = options;

  assertAbsolute(sourceDir);
  assertAbsolute(destination);

  await pipelineAsync(
    vfs.src(select, {
      buffer: false,
      cwd: sourceDir,
      base: sourceDir,
      dot,
    }),
    vfs.dest(destination)
  );

  // we must update access and modified file times after the file copy
  // has completed, otherwise the copy action can effect modify times.
  if (Boolean(time)) {
    await pipelineAsync(
      vfs.src(select, {
        buffer: false,
        cwd: destination,
        base: destination,
        dot,
      }),
      new Writable({
        objectMode: true,
        write(file: File, _, cb) {
          utimesAsync(file.path, time, time).then(() => cb(), cb);
        },
      })
    );
  }
}

export async function getFileHash(path: string, algo: string) {
  assertAbsolute(path);

  const hash = createHash(algo);
  const readStream = fs.createReadStream(path);
  await new Promise((res, rej) => {
    readStream
      .on('data', (chunk) => hash.update(chunk))
      .on('error', rej)
      .on('end', res);
  });

  return hash.digest('hex');
}

export async function untar(
  source: string,
  destination: string,
  extractOptions: ExtractOptions = {}
) {
  assertAbsolute(source);
  assertAbsolute(destination);

  await mkdirAsync(destination, { recursive: true });

  await pipelineAsync(
    fs.createReadStream(source),
    createGunzip(),
    tar.extract({
      ...extractOptions,
      cwd: destination,
    })
  );
}

export async function gunzip(source: string, destination: string) {
  assertAbsolute(source);
  assertAbsolute(destination);

  await mkdirAsync(dirname(destination), { recursive: true });

  await pipelineAsync(
    fs.createReadStream(source),
    createGunzip(),
    fs.createWriteStream(destination)
  );
}

interface CompressTarOptions {
  createRootDirectory: boolean;
  source: string;
  destination: string;
  archiverOptions?: archiver.TarOptions & archiver.CoreOptions;
}
export async function compressTar({
  source,
  destination,
  archiverOptions,
  createRootDirectory,
}: CompressTarOptions) {
  const output = fs.createWriteStream(destination);
  const archive = archiver('tar', archiverOptions);
  const name = createRootDirectory ? source.split(sep).slice(-1)[0] : false;

  archive.pipe(output);

  return archive.directory(source, name).finalize();
}

interface CompressZipOptions {
  createRootDirectory: boolean;
  source: string;
  destination: string;
  archiverOptions?: archiver.ZipOptions & archiver.CoreOptions;
}
export async function compressZip({
  source,
  destination,
  archiverOptions,
  createRootDirectory,
}: CompressZipOptions) {
  const output = fs.createWriteStream(destination);
  const archive = archiver('zip', archiverOptions);
  const name = createRootDirectory ? source.split(sep).slice(-1)[0] : false;

  archive.pipe(output);

  return archive.directory(source, name).finalize();
}
