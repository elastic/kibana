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

import Fs from 'fs';

import sinon from 'sinon';
import glob from 'glob-all';
import rimraf from 'rimraf';
import Logger from '../lib/logger';
import { extract, getPackData } from './pack';
import { _downloadSingle } from './download';
import { join } from 'path';

describe('kibana cli', function() {
  describe('pack', function() {
    let testNum = 0;
    const workingPathRoot = join(__dirname, '.test.data.pack');
    let testWorkingPath;
    let tempArchiveFilePath;
    let testPluginPath;
    let logger;
    let settings;

    beforeEach(function() {
      //These tests are dependent on the file system, and I had some inconsistent
      //behavior with rimraf.sync show up. Until these tests are re-written to not
      //depend on the file system, I make sure that each test uses a different
      //working directory.
      testNum += 1;
      testWorkingPath = join(workingPathRoot, testNum + '');
      tempArchiveFilePath = join(testWorkingPath, 'archive.part');
      testPluginPath = join(testWorkingPath, '.installedPlugins');

      settings = {
        workingPath: testWorkingPath,
        tempArchiveFile: tempArchiveFilePath,
        pluginDir: testPluginPath,
        plugin: 'test-plugin',
      };

      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      Fs.mkdirSync(testWorkingPath, { recursive: true });
    });

    afterEach(function() {
      logger.log.restore();
      logger.error.restore();
      rimraf.sync(workingPathRoot);
    });

    function copyReplyFile(filename) {
      const filePath = join(__dirname, '__fixtures__', 'replies', filename);
      const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

      return _downloadSingle(settings, logger, sourceUrl);
    }

    function shouldReject() {
      throw new Error('expected the promise to reject');
    }

    describe('extract', function() {
      //Also only extracts the content from the kibana folder.
      //Ignores the others.
      it('successfully extract a valid zip', function() {
        return copyReplyFile('test_plugin.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(() => {
            return extract(settings, logger);
          })
          .then(() => {
            const files = glob.sync('**/*', { cwd: testWorkingPath });
            const expected = [
              'archive.part',
              'README.md',
              'index.js',
              'package.json',
              'public',
              'public/app.js',
              'extra file only in zip.txt',
            ];
            expect(files.sort()).toEqual(expected.sort());
          });
      });
    });

    describe('getPackData', function() {
      it('populate settings.plugins', function() {
        return copyReplyFile('test_plugin.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(() => {
            expect(settings.plugins[0].name).toBe('test-plugin');
            expect(settings.plugins[0].archivePath).toBe('kibana/test-plugin');
            expect(settings.plugins[0].version).toBe('1.0.0');
            expect(settings.plugins[0].kibanaVersion).toBe('1.0.0');
          });
      });

      it('populate settings.plugin.kibanaVersion', function() {
        //kibana.version is defined in this package.json and is different than plugin version
        return copyReplyFile('test_plugin_different_version.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(() => {
            expect(settings.plugins[0].kibanaVersion).toBe('5.0.1');
          });
      });

      it('populate settings.plugin.kibanaVersion (default to plugin version)', function() {
        //kibana.version is not defined in this package.json, defaults to plugin version
        return copyReplyFile('test_plugin.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(() => {
            expect(settings.plugins[0].kibanaVersion).toBe('1.0.0');
          });
      });

      it('populate settings.plugins with multiple plugins', function() {
        return copyReplyFile('test_plugin_many.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(() => {
            expect(settings.plugins[0].name).toBe('funger-plugin');
            expect(settings.plugins[0].archivePath).toBe('kibana/funger-plugin');
            expect(settings.plugins[0].version).toBe('1.0.0');

            expect(settings.plugins[1].name).toBe('pdf');
            expect(settings.plugins[1].archivePath).toBe('kibana/pdf-linux');
            expect(settings.plugins[1].version).toBe('1.0.0');

            expect(settings.plugins[2].name).toBe('pdf');
            expect(settings.plugins[2].archivePath).toBe('kibana/pdf-win32');
            expect(settings.plugins[2].version).toBe('1.0.0');

            expect(settings.plugins[3].name).toBe('pdf');
            expect(settings.plugins[3].archivePath).toBe('kibana/pdf-win64');
            expect(settings.plugins[3].version).toBe('1.0.0');

            expect(settings.plugins[4].name).toBe('pdf');
            expect(settings.plugins[4].archivePath).toBe('kibana/pdf');
            expect(settings.plugins[4].version).toBe('1.0.0');

            expect(settings.plugins[5].name).toBe('test-plugin');
            expect(settings.plugins[5].archivePath).toBe('kibana/test-plugin');
            expect(settings.plugins[5].version).toBe('1.0.0');
          });
      });

      it('throw an error if there is no kibana plugin', function() {
        return copyReplyFile('test_plugin_no_kibana.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(shouldReject, err => {
            expect(err.message).toMatch(/No kibana plugins found in archive/i);
          });
      });

      it('throw an error with a corrupt zip', function() {
        return copyReplyFile('corrupt.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(shouldReject, err => {
            expect(err.message).toMatch(/error retrieving/i);
          });
      });

      it('throw an error if there an invalid plugin name', function() {
        return copyReplyFile('invalid_name.zip')
          .then(() => {
            return getPackData(settings, logger);
          })
          .then(shouldReject, err => {
            expect(err.message).toMatch(/invalid plugin name/i);
          });
      });
    });
  });
});
