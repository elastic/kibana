import fs from 'fs';
import { relative, dirname } from 'path';
import { promisify } from 'bluebird';
import cmdShimCb from 'cmd-shim';
import mkdirpCb from 'mkdirp';

const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const symlink = promisify(fs.symlink);
const chmod = promisify(fs.chmod);
const cmdShim = promisify(cmdShimCb);

export { chmod, readFile };

async function statTest(path: string, block: (stats: fs.Stats) => boolean) {
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
 * Creates the specified directory including any necessary parent directories that don't yet exist.
 * @param dir Directory to create.
 * @param mode The mode that will be set for directories that need to be created.
 * @return Path to he first directory that had to be created, if any.
 */
export function mkdirp(dir: string, mode?: string | number) {
  // Custom wrapper around `mkdirp` to provide Promise-based interface. We don't use `promisify`
  // function here since it can't automatically infer the right overload and we don't want to expose
  // options format used by `mkdirp` directly.
  return new Promise<string | null>((resolve, reject) => {
    // If mode is provided we can pass it directly, otherwise we should specify empty `options` object.
    const options = mode === undefined ? {} : mode;
    mkdirpCb(dir, options, (err, args) => {
      if (err) {
        reject(err);
      } else {
        resolve(args);
      }
    });
  });
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
