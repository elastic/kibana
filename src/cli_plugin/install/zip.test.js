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

import rimraf from 'rimraf';
import path from 'path';
import os from 'os';
import glob from 'glob';
import fs from 'fs';
import { analyzeArchive, extractArchive, _isDirectory } from './zip';

describe('kibana cli', function () {

  describe('zip', function () {
    const repliesPath = path.resolve(__dirname, '__fixtures__', 'replies');
    const archivePath = path.resolve(repliesPath, 'test_plugin.zip');

    let tempPath;

    beforeEach(() => {
      const randomDir = Math.random().toString(36);
      tempPath = path.resolve(os.tmpdir(), randomDir);
    });

    afterEach(() => {
      rimraf.sync(tempPath);
    });

    describe('analyzeArchive', function () {
      it('returns array of plugins', async () => {
        const packages = await analyzeArchive(archivePath);
        const plugin = packages[0];

        expect(packages).toBeInstanceOf(Array);
        expect(plugin.name).toBe('test-plugin');
        expect(plugin.archivePath).toBe('kibana/test-plugin');
        expect(plugin.archive).toBe(archivePath);
        expect(plugin.kibanaVersion).toBe('1.0.0');
      });
    });

    describe('extractArchive', () => {
      it('extracts files using the extractPath filter', async () => {
        const archive = path.resolve(repliesPath, 'test_plugin_many.zip');

        await extractArchive(archive, tempPath, 'kibana/test-plugin');
        const files = await glob.sync('**/*', { cwd: tempPath });

        const expected = [
          'extra file only in zip.txt',
          'index.js',
          'package.json',
          'public',
          'public/app.js',
          'README.md'
        ];
        expect(files.sort()).toEqual(expected.sort());
      });
    });

    describe('checkFilePermission', () => {
      it('verify consistency of modes of files', async () => {
        const archivePath = path.resolve(repliesPath, 'test_plugin.zip');

        await extractArchive(archivePath, tempPath, 'kibana/libs');
        const files = await glob.sync('**/*', { cwd: tempPath });

        const expected = [
          'executable',
          'unexecutable'
        ];
        expect(files.sort()).toEqual(expected.sort());

        const executableMode = '0' + (fs.statSync(path.resolve(tempPath, 'executable')).mode & parseInt('777', 8)).toString(8);
        const unExecutableMode = '0' + (fs.statSync(path.resolve(tempPath, 'unexecutable')).mode & parseInt('777', 8)).toString(8);

        expect(executableMode).toEqual('0755');
        expect(unExecutableMode).toEqual('0644');

      });
    });

    it('handles a corrupt zip archive', async () => {
      try {
        await extractArchive(path.resolve(repliesPath, 'corrupt.zip'));
        throw new Error('This should have failed');
      } catch(e) {
        return;
      }
    });
  });

  describe('_isDirectory', () => {
    it('should check for a forward slash', () => {
      expect(_isDirectory('/foo/bar/')).toBe(true);
    });

    it('should check for a backslash', () => {
      expect(_isDirectory('\\foo\\bar\\')).toBe(true);
    });

    it('should return false for files', () => {
      expect(_isDirectory('foo.txt')).toBe(false);
      expect(_isDirectory('\\path\\to\\foo.txt')).toBe(false);
      expect(_isDirectory('/path/to/foo.txt')).toBe(false);
    });
  });

});
