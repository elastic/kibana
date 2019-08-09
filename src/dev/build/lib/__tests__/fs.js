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

import { resolve } from 'path';
import { chmodSync, statSync } from 'fs';

import del from 'del';
import expect from '@kbn/expect';

import { mkdirp, write, read, getChildPaths, copyAll, getFileHash, untar } from '../fs';

const TMP = resolve(__dirname, '__tmp__');
const FIXTURES = resolve(__dirname, 'fixtures');
const FOO_TAR_PATH = resolve(FIXTURES, 'foo_dir.tar.gz');
const BAR_TXT_PATH = resolve(FIXTURES, 'foo_dir/bar.txt');
const WORLD_EXECUTABLE = resolve(FIXTURES, 'bin/world_executable');

const isWindows = /^win/.test(process.platform);

// get the mode of a file as a string, like 777, or 644,
function getCommonMode(path) {
  return statSync(path).mode.toString(8).slice(-3);
}

function assertNonAbsoluteError(error) {
  expect(error).to.be.an(Error);
  expect(error.message).to.contain('Please use absolute paths');
}

describe('dev/build/lib/fs', () => {

  // ensure WORLD_EXECUTABLE is actually executable by all
  before(async () => {
    chmodSync(WORLD_EXECUTABLE, 0o777);
  });

  // clean and recreate TMP directory
  beforeEach(async () => {
    await del(TMP);
    await mkdirp(TMP);
  });

  // cleanup TMP directory
  after(async () => {
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

      expect(await mkdirp(destination)).to.be(undefined);

      expect(statSync(destination).isDirectory()).to.be(true);
    });
  });

  describe('write()', () => {
    it('rejects if path is not absolute', async () => {
      try {
        await write('foo/bar');
        throw new Error('Expected write() to reject');
      } catch (error) {
        assertNonAbsoluteError(error);
      }
    });

    it('writes content to a file with existing parent directory', async () => {
      const destination = resolve(TMP, 'a');

      expect(await write(destination, 'bar')).to.be(undefined);
      expect(await read(destination)).to.be('bar');
    });

    it('writes content to a file with missing parents', async () => {
      const destination = resolve(TMP, 'a/b/c/d/e');

      expect(await write(destination, 'bar')).to.be(undefined);
      expect(await read(destination)).to.be('bar');
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
      expect(await read(BAR_TXT_PATH)).to.be('bar\n');
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
      expect((await getChildPaths(path)).sort()).to.eql([
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
        expect(error).to.have.property('code', 'ENOENT');
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
      const destination = resolve(TMP, 'a/b/c');
      await copyAll(FIXTURES, destination);

      expect((await getChildPaths(resolve(destination, 'foo_dir'))).sort()).to.eql([
        resolve(destination, 'foo_dir/bar.txt'),
        resolve(destination, 'foo_dir/foo'),
      ]);

      expect(getCommonMode(resolve(destination, 'bin/world_executable'))).to.be(isWindows ? '666' : '777');
      expect(getCommonMode(resolve(destination, 'foo_dir/bar.txt'))).to.be(isWindows ? '666' : '644');
    });

    it('applies select globs if specified, ignores dot files', async () => {
      const destination = resolve(TMP, 'a/b/c/d');
      await copyAll(FIXTURES, destination, {
        select: ['**/*bar*']
      });

      try {
        statSync(resolve(destination, 'bin/world_executable'));
        throw new Error('expected bin/world_executable to not by copied');
      } catch (error) {
        expect(error).to.have.property('code', 'ENOENT');
      }

      try {
        statSync(resolve(destination, 'foo_dir/.bar'));
        throw new Error('expected foo_dir/.bar to not by copied');
      } catch (error) {
        expect(error).to.have.property('code', 'ENOENT');
      }

      expect(await read(resolve(destination, 'foo_dir/bar.txt'))).to.be('bar\n');
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
        expect(error).to.have.property('code', 'ENOENT');
      }

      expect(await read(resolve(destination, 'foo_dir/bar.txt'))).to.be('bar\n');
      expect(await read(resolve(destination, 'foo_dir/.bar'))).to.be('dotfile\n');
    });


    it('supports atime and mtime', async () => {
      const destination = resolve(TMP, 'a/b/c/d/e');
      const time = new Date(1425298511000);
      await copyAll(FIXTURES, destination, {
        time
      });
      const barTxt = statSync(resolve(destination, 'foo_dir/bar.txt'));
      const fooDir = statSync(resolve(destination, 'foo_dir'));

      // precision is platform specific
      const oneDay = 86400000;
      expect(Math.abs(barTxt.atimeMs - time.getTime())).to.be.below(oneDay);
      expect(Math.abs(fooDir.atimeMs - time.getTime())).to.be.below(oneDay);
      expect(Math.abs(barTxt.mtimeMs - time.getTime())).to.be.below(oneDay);
    });
  });

  describe('getFileHash()', () => {
    it('rejects if path is not absolute', async () => {
      try {
        await getFileHash('foo/bar');
        throw new Error('Expected getFileHash() to reject');
      } catch (error) {
        assertNonAbsoluteError(error);
      }
    });

    it('resolves with the sha1 hash of a file', async () => {
      expect(await getFileHash(BAR_TXT_PATH, 'sha1'))
        .to.be('e242ed3bffccdf271b7fbaf34ed72d089537b42f');
    });
    it('resolves with the sha256 hash of a file', async () => {
      expect(await getFileHash(BAR_TXT_PATH, 'sha256'))
        .to.be('7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730');
    });
    it('resolves with the md5 hash of a file', async () => {
      expect(await getFileHash(BAR_TXT_PATH, 'md5'))
        .to.be('c157a79031e1c40f85931829bc5fc552');
    });
  });

  describe('untar()', () => {
    it('rejects if source path is not absolute', async () => {
      try {
        await untar('foo/bar', '**/*', __dirname);
        throw new Error('Expected untar() to reject');
      } catch (error) {
        assertNonAbsoluteError(error);
      }
    });

    it('rejects if destination path is not absolute', async () => {
      try {
        await untar(__dirname, '**/*', 'foo/bar');
        throw new Error('Expected untar() to reject');
      } catch (error) {
        assertNonAbsoluteError(error);
      }
    });

    it('rejects if neither path is not absolute', async () => {
      try {
        await untar('foo/bar', '**/*', 'foo/bar');
        throw new Error('Expected untar() to reject');
      } catch (error) {
        assertNonAbsoluteError(error);
      }
    });

    it('extracts tarbar from source into destination, creating destination if necessary', async () => {
      const destination = resolve(TMP, 'a/b/c/d/e/f');
      await untar(FOO_TAR_PATH, destination);
      expect(await read(resolve(destination, 'foo_dir/bar.txt'))).to.be('bar\n');
      expect(await read(resolve(destination, 'foo_dir/foo/foo.txt'))).to.be('foo\n');
    });

    it('passed thrid argument to Extract class, overriding path with destination', async () => {
      const destination = resolve(TMP, 'a/b/c');

      await untar(FOO_TAR_PATH, destination, {
        path: '/dev/null',
        strip: 1
      });

      expect(await read(resolve(destination, 'bar.txt'))).to.be('bar\n');
      expect(await read(resolve(destination, 'foo/foo.txt'))).to.be('foo\n');
    });
  });
});
