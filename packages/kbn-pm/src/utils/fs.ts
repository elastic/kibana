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

import cmdShimCb from 'cmd-shim';
import fs from 'fs';
import { ncp } from 'ncp';
import { dirname, relative } from 'path';
import { promisify } from 'util';

const lstat = promisify(fs.lstat);
export const readFile = promisify(fs.readFile);
const symlink = promisify(fs.symlink);
export const chmod = promisify(fs.chmod);
const cmdShim = promisify<string, string>(cmdShimCb);
const mkdir = promisify(fs.mkdir);
export const mkdirp = async (path: string) => await mkdir(path, { recursive: true });
export const unlink = promisify(fs.unlink);
export const copyDirectory = promisify(ncp);

async function statTest(path: string, block: (stats: fs.Stats) => boolean) {
  try {
    return block(await lstat(path));
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

/**
 * Test if a path points to a symlink.
 * @param path
 */
export async function isSymlink(path: string) {
  return await statTest(path, stats => stats.isSymbolicLink());
}

/**
 * Test if a path points to a directory.
 * @param path
 */
export async function isDirectory(path: string) {
  return await statTest(path, stats => stats.isDirectory());
}

/**
 * Test if a path points to a regular file.
 * @param path
 */
export async function isFile(path: string) {
  return await statTest(path, stats => stats.isFile());
}

/**
 * Create a symlink at dest that points to src. Adapted from
 * https://github.com/lerna/lerna/blob/2f1b87d9e2295f587e4ac74269f714271d8ed428/src/FileSystemUtilities.js#L103.
 *
 * @param src
 * @param dest
 * @param type 'dir', 'file', 'junction', or 'exec'. 'exec' on
 *  windows will use the `cmd-shim` module since symlinks can't be used
 *  for executable files on windows.
 */
export async function createSymlink(src: string, dest: string, type: string) {
  if (process.platform === 'win32') {
    if (type === 'exec') {
      await cmdShim(src, dest);
    } else {
      await forceCreate(src, dest, type);
    }
  } else {
    const posixType = type === 'exec' ? 'file' : type;
    const relativeSource = relative(dirname(dest), src);
    await forceCreate(relativeSource, dest, posixType);
  }
}

async function forceCreate(src: string, dest: string, type: string) {
  try {
    // If something exists at `dest` we need to remove it first.
    await unlink(dest);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await symlink(src, dest, type);
}
