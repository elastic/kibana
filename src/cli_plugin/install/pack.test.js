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
import { join } from 'path';

import sinon from 'sinon';
import glob from 'glob-all';
import del from 'del';

import { Logger } from '../lib/logger';
import { extract, getPackData } from './pack';
import { _downloadSingle } from './download';

describe('kibana cli', function () {
  describe('pack', function () {
    let testNum = 0;
    const workingPathRoot = join(__dirname, '.test.data.pack');
    let testWorkingPath;
    let tempArchiveFilePath;
    let testPluginPath;
    let logger;
    let settings;

    beforeEach(function () {
      //These tests are dependent on the file system, and I had some inconsistent
      //behavior with del.sync show up. Until these tests are re-written to not
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

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      del.sync(workingPathRoot);
    });

    function copyReplyFile(filename) {
      const filePath = join(__dirname, '__fixtures__', 'replies', filename);
      const sourceUrl = 'file://' + filePath.replace(/\\/g, '/');

      return _downloadSingle(settings, logger, sourceUrl);
    }

    describe('extract', function () {
      // Also only extracts the content from the kibana folder.
      // Ignores the others.
      it('successfully extract a valid zip', async () => {
        await copyReplyFile('test_plugin.zip');
        await getPackData(settings, logger);
        await extract(settings, logger);

        expect(glob.sync('**/*', { cwd: testWorkingPath })).toMatchInlineSnapshot(`
          Array [
            "archive.part",
            "bin",
            "bin/executable",
            "bin/not-executable",
            "kibana.json",
            "node_modules",
            "node_modules/some-package",
            "node_modules/some-package/index.js",
            "node_modules/some-package/package.json",
            "public",
            "public/index.js",
          ]
        `);
      });
    });

    describe('getPackData', () => {
      it('populate settings.plugins', async () => {
        await copyReplyFile('test_plugin.zip');
        await getPackData(settings, logger);
        expect(settings.plugins).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "testPlugin",
              "kibanaVersion": "1.0.0",
              "stripPrefix": "kibana/test-plugin",
            },
          ]
        `);
      });

      it('populate settings.plugin.kibanaVersion', async () => {
        await copyReplyFile('test_plugin_different_version.zip');
        await getPackData(settings, logger);
        expect(settings.plugins).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "testPlugin",
              "kibanaVersion": "5.0.1",
              "stripPrefix": "kibana/test-plugin",
            },
          ]
        `);
      });

      it('populate settings.plugins with multiple plugins', async () => {
        await copyReplyFile('test_plugin_many.zip');
        await getPackData(settings, logger);
        expect(settings.plugins).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "fungerPlugin",
              "kibanaVersion": "1.0.0",
              "stripPrefix": "kibana/funger-plugin",
            },
            Object {
              "id": "pdf",
              "kibanaVersion": "1.0.0",
              "stripPrefix": "kibana/pdf",
            },
            Object {
              "id": "testPlugin",
              "kibanaVersion": "1.0.0",
              "stripPrefix": "kibana/test-plugin",
            },
          ]
        `);
      });

      it('throw an error if there is no kibana plugin', async () => {
        await copyReplyFile('test_plugin_no_kibana.zip');
        await expect(getPackData(settings, logger)).rejects.toThrowErrorMatchingInlineSnapshot(
          `"No kibana plugins found in archive"`
        );
      });

      it('throw an error with a corrupt zip', async () => {
        await copyReplyFile('corrupt.zip');
        await expect(getPackData(settings, logger)).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Error retrieving metadata from plugin archive"`
        );
      });

      it('throw an error if there an invalid plugin name', async () => {
        await copyReplyFile('invalid_name.zip');
        await expect(getPackData(settings, logger)).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Invalid plugin name [invalid name] in kibana.json, expected it to be valid camelCase"`
        );
      });
    });
  });
});
