import fs from 'fs';
import { relative, dirname } from 'path';
import promisify from 'pify';
import cmdShimCb from 'cmd-shim';
import mkdirpCb from 'mkdirp';

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const symlink = promisify(fs.symlink);
const chmod = promisify(fs.chmod);
const cmdShim = promisify(cmdShimCb);
const mkdirp = promisify(mkdirpCb);

export { chmod, mkdirp, readFile };

async function statTest(path, block) {
  try {
    return block(await stat(path));
  } catch (e) {
    if (e.code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

/**
 * Test if a path points to a directory
 * @param  {String} path
 * @return {Promise<Boolean>}
 */
export async function isDirectory(path) {
  return await statTest(path, stats => stats.isDirectory());
}

/**
 * Test if a path points to a regular file
 * @param  {String} path
 * @return {Promise<Boolean>}
 */
export async function isFile(path) {
  return await statTest(path, stats => stats.isFile());
}

/**
 * Create a symlink at dest that points to src. Adapted from
 * https://github.com/lerna/lerna/blob/2f1b87d9e2295f587e4ac74269f714271d8ed428/src/FileSystemUtilities.js#L103
 *
 * @param  {String} src
 * @param  {String} dest
 * @param  {String} type 'dir', 'file', 'junction', or 'exec'. 'exec' on
 *  windows will use the `cmd-shim` module since symlinks can't be used
 *  for executable files on windows.
 * @return {Promise<undefined>}
 */
export async function createSymlink(src, dest, type) {
  async function forceCreate(src, dest, type) {
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
