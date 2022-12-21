/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import Fsp from 'fs/promises';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { resolve, dirname, isAbsolute, sep } from 'path';
import { createGunzip } from 'zlib';
import { inspect } from 'util';

import archiver from 'archiver';
import globby from 'globby';
import cpy from 'cpy';
import del from 'del';
import deleteEmpty from 'delete-empty';
import tar, { ExtractOptions } from 'tar';
import { ToolingLog } from '@kbn/tooling-log';

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
  await Fsp.mkdir(path, { recursive: true });
}

export async function write(path: string, contents: string) {
  assertAbsolute(path);
  await mkdirp(dirname(path));
  await Fsp.writeFile(path, contents);
}

export async function read(path: string) {
  assertAbsolute(path);
  return await Fsp.readFile(path, 'utf8');
}

export async function getChildPaths(path: string) {
  assertAbsolute(path);
  const childNames = await Fsp.readdir(path);
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
  const emptyFoldersList = (await deleteEmpty(rootFolderPath, {
    // @ts-expect-error DT package has incorrect types https://github.com/jonschlinkert/delete-empty/blob/6ae34547663e6845c3c98b184c606fa90ef79c0a/index.js#L160
    dryRun: true,
  })) as unknown as string[]; // DT package has incorrect types

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
  await Fsp.stat(source);
  await mkdirp(dirname(destination));
  return await Fsp.copyFile(source, destination, options.clone ? fs.constants.COPYFILE_FICLONE : 0);
}

interface CopyAllOptions {
  select?: string[];
  dot?: boolean;
  time?: Date;
}

export async function copyAll(
  sourceDir: string,
  destination: string,
  options: CopyAllOptions = {}
) {
  const { select = ['**/*'], dot = false, time } = options;

  assertAbsolute(sourceDir);
  assertAbsolute(destination);

  const copiedFiles = await cpy(select, destination, {
    cwd: sourceDir,
    parents: true,
    ignoreJunk: false,
    dot,
  });

  // we must update access and modified file times after the file copy
  // has completed, otherwise the copy action can effect modify times.
  if (time) {
    const copiedDirectories = await globby(select, {
      cwd: destination,
      dot,
      onlyDirectories: true,
      absolute: true,
    });
    await Promise.all(
      [...copiedFiles, ...copiedDirectories].map((entry) => Fsp.utimes(entry, time, time))
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

  await Fsp.mkdir(destination, { recursive: true });

  await pipeline(
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

  await Fsp.mkdir(dirname(destination), { recursive: true });

  await pipeline(fs.createReadStream(source), createGunzip(), fs.createWriteStream(destination));
}

interface CompressTarOptions {
  createRootDirectory: boolean;
  rootDirectoryName?: string;
  source: string;
  destination: string;
  archiverOptions?: archiver.TarOptions & archiver.CoreOptions;
}
export async function compressTar({
  source,
  destination,
  archiverOptions,
  createRootDirectory,
  rootDirectoryName,
}: CompressTarOptions) {
  const output = fs.createWriteStream(destination);
  const archive = archiver('tar', archiverOptions);
  const folder = rootDirectoryName ? rootDirectoryName : source.split(sep).slice(-1)[0];
  const name = createRootDirectory ? folder : false;
  archive.pipe(output);

  let fileCount = 0;
  archive.on('entry', (entry) => {
    if (entry.stats?.isFile()) {
      fileCount += 1;
    }
  });

  await archive.directory(source, name).finalize();

  return fileCount;
}

interface CompressZipOptions {
  createRootDirectory: boolean;
  rootDirectoryName?: string;
  source: string;
  destination: string;
  archiverOptions?: archiver.ZipOptions & archiver.CoreOptions;
}
export async function compressZip({
  source,
  destination,
  archiverOptions,
  createRootDirectory,
  rootDirectoryName,
}: CompressZipOptions) {
  const output = fs.createWriteStream(destination);
  const archive = archiver('zip', archiverOptions);
  const folder = rootDirectoryName ? rootDirectoryName : source.split(sep).slice(-1)[0];
  const name = createRootDirectory ? folder : false;
  archive.pipe(output);

  let fileCount = 0;
  archive.on('entry', (entry) => {
    if (entry.stats?.isFile()) {
      fileCount += 1;
    }
  });

  await archive.directory(source, name).finalize();

  return fileCount;
}
