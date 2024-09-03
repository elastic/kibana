/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { chmodSync, statSync } from 'fs';

import del from 'del';

import { mkdirp, write, read, getChildPaths, copyAll, getFileHash, untar, gunzip } from '../fs';

const TMP = resolve(__dirname, '../__tmp__');
const FIXTURES = resolve(__dirname, '../__fixtures__');
const FOO_TAR_PATH = resolve(FIXTURES, 'foo_dir.tar.gz');
const FOO_GZIP_PATH = resolve(FIXTURES, 'foo.txt.gz');
const BAR_TXT_PATH = resolve(FIXTURES, 'foo_dir/bar.txt');
const WORLD_EXECUTABLE = resolve(FIXTURES, 'bin/world_executable');

const isWindows = /^win/.test(process.platform);

// get the mode of a file as a string, like 777, or 644,
function getCommonMode(path: string) {
  return statSync(path).mode.toString(8).slice(-3);
}

function assertNonAbsoluteError(error: any) {
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toContain('Please use absolute paths');
}

// ensure WORLD_EXECUTABLE is actually executable by all
beforeAll(async () => {
  chmodSync(WORLD_EXECUTABLE, 0o777);
});

// clean and recreate TMP directory
beforeEach(async () => {
  await del(TMP);
  await mkdirp(TMP);
});

// cleanup TMP directory
afterAll(async () => {
  await del(TMP);
});

describe('mkdirp()', () => {
  it('rejects if path is not absolute', async () => {
    try {
      await mkdirp('foo/bar');
      throw new Error('Expected mkdirp() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('makes directory and necessary parent directories', async () => {
    const destination = resolve(TMP, 'a/b/c/d/e/f/g');

    expect(await mkdirp(destination)).toBe(undefined);

    expect(statSync(destination).isDirectory()).toBe(true);
  });
});

describe('write()', () => {
  it('rejects if path is not absolute', async () => {
    try {
      // @ts-expect-error missing content intentional
      await write('foo/bar');
      throw new Error('Expected write() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('writes content to a file with existing parent directory', async () => {
    const destination = resolve(TMP, 'a');

    expect(await write(destination, 'bar')).toBe(undefined);
    expect(await read(destination)).toBe('bar');
  });

  it('writes content to a file with missing parents', async () => {
    const destination = resolve(TMP, 'a/b/c/d/e');

    expect(await write(destination, 'bar')).toBe(undefined);
    expect(await read(destination)).toBe('bar');
  });
});

describe('read()', () => {
  it('rejects if path is not absolute', async () => {
    try {
      await read('foo/bar');
      throw new Error('Expected read() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('reads file, resolves with result', async () => {
    expect(await read(BAR_TXT_PATH)).toBe('bar\n');
  });
});

describe('getChildPaths()', () => {
  it('rejects if path is not absolute', async () => {
    try {
      await getChildPaths('foo/bar');
      throw new Error('Expected getChildPaths() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('resolves with absolute paths to the children of directory', async () => {
    const path = resolve(FIXTURES, 'foo_dir');
    expect((await getChildPaths(path)).sort()).toEqual([
      resolve(FIXTURES, 'foo_dir/.bar'),
      BAR_TXT_PATH,
      resolve(FIXTURES, 'foo_dir/foo'),
    ]);
  });

  it('rejects with ENOENT if path does not exist', async () => {
    try {
      await getChildPaths(resolve(FIXTURES, 'notrealpath'));
      throw new Error('Expected getChildPaths() to reject');
    } catch (error) {
      expect(error).toHaveProperty('code', 'ENOENT');
    }
  });
});

describe('copyAll()', () => {
  it('rejects if source path is not absolute', async () => {
    try {
      await copyAll('foo/bar', __dirname);
      throw new Error('Expected copyAll() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('rejects if destination path is not absolute', async () => {
    try {
      await copyAll(__dirname, 'foo/bar');
      throw new Error('Expected copyAll() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('rejects if neither path is not absolute', async () => {
    try {
      await copyAll('foo/bar', 'foo/bar');
      throw new Error('Expected copyAll() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('copies files and directories from source to dest, creating dest if necessary, respecting mode', async () => {
    const pathToExecutable = resolve(FIXTURES, 'bin/world_executable');
    const pathToNonExecutable = resolve(FIXTURES, 'foo_dir/bar.txt');

    const modeExecutable = getCommonMode(pathToExecutable);
    const modeNonExecutable = getCommonMode(pathToNonExecutable);

    const destination = resolve(TMP, 'a/b/c');
    const newPathExecutable = resolve(destination, 'bin/world_executable');
    const newPathNonExecutable = resolve(destination, 'foo_dir/bar.txt');

    await copyAll(FIXTURES, destination);

    expect((await getChildPaths(resolve(destination, 'foo_dir'))).sort()).toEqual([
      resolve(destination, 'foo_dir/bar.txt'),
      resolve(destination, 'foo_dir/foo'),
    ]);

    expect(getCommonMode(newPathExecutable)).toBe(isWindows ? '666' : modeExecutable);
    expect(getCommonMode(newPathNonExecutable)).toBe(isWindows ? '666' : modeNonExecutable);
  });

  it('applies select globs if specified, ignores dot files', async () => {
    const destination = resolve(TMP, 'a/b/c/d');
    await copyAll(FIXTURES, destination, {
      select: ['**/*bar*'],
    });

    try {
      statSync(resolve(destination, 'bin/world_executable'));
      throw new Error('expected bin/world_executable to not by copied');
    } catch (error) {
      expect(error).toHaveProperty('code', 'ENOENT');
    }

    try {
      statSync(resolve(destination, 'foo_dir/.bar'));
      throw new Error('expected foo_dir/.bar to not by copied');
    } catch (error) {
      expect(error).toHaveProperty('code', 'ENOENT');
    }

    expect(await read(resolve(destination, 'foo_dir/bar.txt'))).toBe('bar\n');
  });

  it('supports select globs and dot option together', async () => {
    const destination = resolve(TMP, 'a/b/c/d');
    await copyAll(FIXTURES, destination, {
      select: ['**/*bar*'],
      dot: true,
    });

    try {
      statSync(resolve(destination, 'bin/world_executable'));
      throw new Error('expected bin/world_executable to not by copied');
    } catch (error) {
      expect(error).toHaveProperty('code', 'ENOENT');
    }

    expect(await read(resolve(destination, 'foo_dir/bar.txt'))).toBe('bar\n');
    expect(await read(resolve(destination, 'foo_dir/.bar'))).toBe('dotfile\n');
  });

  it('supports atime and mtime', async () => {
    const destination = resolve(TMP, 'a/b/c/d/e');
    const time = new Date(1425298511000);
    await copyAll(FIXTURES, destination, {
      time,
    });
    const barTxt = statSync(resolve(destination, 'foo_dir/bar.txt'));
    const fooDir = statSync(resolve(destination, 'foo_dir'));

    // precision is platform specific
    const oneDay = 86400000;
    expect(Math.abs(barTxt.atimeMs - time.getTime())).toBeLessThan(oneDay);
    expect(Math.abs(fooDir.atimeMs - time.getTime())).toBeLessThan(oneDay);
    expect(Math.abs(barTxt.mtimeMs - time.getTime())).toBeLessThan(oneDay);
  });
});

describe('getFileHash()', () => {
  it('rejects if path is not absolute', async () => {
    try {
      await getFileHash('foo/bar', 'some content');
      throw new Error('Expected getFileHash() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('resolves with the sha1 hash of a file', async () => {
    expect(await getFileHash(BAR_TXT_PATH, 'sha1')).toBe(
      'e242ed3bffccdf271b7fbaf34ed72d089537b42f'
    );
  });
  it('resolves with the sha256 hash of a file', async () => {
    expect(await getFileHash(BAR_TXT_PATH, 'sha256')).toBe(
      '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730'
    );
  });
  it('resolves with the md5 hash of a file', async () => {
    expect(await getFileHash(BAR_TXT_PATH, 'md5')).toBe('c157a79031e1c40f85931829bc5fc552');
  });
});

describe('untar()', () => {
  it('rejects if source path is not absolute', async () => {
    try {
      await untar('foo/bar', '**/*');
      throw new Error('Expected untar() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('rejects if destination path is not absolute', async () => {
    try {
      await untar(__dirname, '**/*');
      throw new Error('Expected untar() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('rejects if neither path is not absolute', async () => {
    try {
      await untar('foo/bar', '**/*');
      throw new Error('Expected untar() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('extracts tarbar from source into destination, creating destination if necessary', async () => {
    const destination = resolve(TMP, 'a/b/c/d/e/f');
    await untar(FOO_TAR_PATH, destination);
    expect(await read(resolve(destination, 'foo_dir/bar.txt'))).toBe('bar\n');
    expect(await read(resolve(destination, 'foo_dir/foo/foo.txt'))).toBe('foo\n');
  });

  it('passed thrid argument to Extract class', async () => {
    const destination = resolve(TMP, 'a/b/c');

    await untar(FOO_TAR_PATH, destination, {
      strip: 1,
    });

    expect(await read(resolve(destination, 'bar.txt'))).toBe('bar\n');
    expect(await read(resolve(destination, 'foo/foo.txt'))).toBe('foo\n');
  });
});

describe('gunzip()', () => {
  it('rejects if source path is not absolute', async () => {
    try {
      await gunzip('foo/bar', '**/*');
      throw new Error('Expected gunzip() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('rejects if destination path is not absolute', async () => {
    try {
      await gunzip(__dirname, '**/*');
      throw new Error('Expected gunzip() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('rejects if neither path is not absolute', async () => {
    try {
      await gunzip('foo/bar', '**/*');
      throw new Error('Expected gunzip() to reject');
    } catch (error) {
      assertNonAbsoluteError(error);
    }
  });

  it('extracts gzip from source into destination, creating destination if necessary', async () => {
    const destination = resolve(TMP, 'z/y/x/v/u/t/foo.txt');
    await gunzip(FOO_GZIP_PATH, destination);
    expect(await read(resolve(destination))).toBe('foo\n');
  });
});
