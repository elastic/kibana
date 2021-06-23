/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cmdShimCb from 'cmd-shim';
import del from 'del';
import fs from 'fs';
import { ncp } from 'ncp';
import { dirname, relative } from 'path';
import { promisify } from 'util';

const lstat = promisify(fs.lstat);
export const readFile = promisify(fs.readFile);
export const writeFile = promisify(fs.writeFile);
const symlink = promisify(fs.symlink);
export const chmod = promisify(fs.chmod);
const cmdShim = promisify<string, string>(cmdShimCb);
const mkdir = promisify(fs.mkdir);
const realpathNative = promisify(fs.realpath.native);
export const mkdirp = async (path: string) => await mkdir(path, { recursive: true });
export const rmdirp = async (path: string) => await del(path, { force: true });
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
  return await statTest(path, (stats) => stats.isSymbolicLink());
}

/**
 * Test if a path points to a directory.
 * @param path
 */
export async function isDirectory(path: string) {
  return await statTest(path, (stats) => stats.isDirectory());
}

/**
 * Test if a path points to a regular file.
 * @param path
 */
export async function isFile(path: string) {
  return await statTest(path, (stats) => stats.isFile());
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

export async function tryRealpath(path: string): Promise<string> {
  let calculatedPath = path;

  try {
    calculatedPath = await realpathNative(path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return calculatedPath;
}
