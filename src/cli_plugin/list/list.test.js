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

import sinon from 'sinon';
import del from 'del';
import Logger from '../lib/logger';
import list from './list';
import { join } from 'path';
import { writeFileSync, appendFileSync, mkdirSync } from 'fs';

function createPlugin(name, version, pluginBaseDir) {
  const pluginDir = join(pluginBaseDir, name);
  mkdirSync(pluginDir, { recursive: true });
  appendFileSync(join(pluginDir, 'package.json'), '{"version": "' + version + '"}');
}

describe('kibana cli', function () {
  describe('plugin lister', function () {
    const pluginDir = join(__dirname, '.test.data.list');
    let logger;

    const settings = {
      pluginDir: pluginDir,
    };

    beforeEach(function () {
      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
      del.sync(pluginDir);
      mkdirSync(pluginDir, { recursive: true });
    });

    afterEach(function () {
      logger.log.restore();
      logger.error.restore();
      del.sync(pluginDir);
    });

    it('list all of the folders in the plugin folder', function () {
      createPlugin('plugin1', '5.0.0-alpha2', pluginDir);
      createPlugin('plugin2', '3.2.1', pluginDir);
      createPlugin('plugin3', '1.2.3', pluginDir);

      list(settings, logger);

      expect(logger.log.calledWith('plugin1@5.0.0-alpha2')).toBe(true);
      expect(logger.log.calledWith('plugin2@3.2.1')).toBe(true);
      expect(logger.log.calledWith('plugin3@1.2.3')).toBe(true);
    });

    it('ignore folders that start with a period', function () {
      createPlugin('.foo', '1.0.0', pluginDir);
      createPlugin('plugin1', '5.0.0-alpha2', pluginDir);
      createPlugin('plugin2', '3.2.1', pluginDir);
      createPlugin('plugin3', '1.2.3', pluginDir);
      createPlugin('.bar', '1.0.0', pluginDir);

      list(settings, logger);

      expect(logger.log.calledWith('.foo@1.0.0')).toBe(false);
      expect(logger.log.calledWith('.bar@1.0.0')).toBe(false);
    });

    it('list should only list folders', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      createPlugin('plugin2', '1.0.0', pluginDir);
      createPlugin('plugin3', '1.0.0', pluginDir);
      writeFileSync(join(pluginDir, 'plugin4'), 'This is a file, and not a folder.');

      list(settings, logger);

      expect(logger.log.calledWith('plugin1@1.0.0')).toBe(true);
      expect(logger.log.calledWith('plugin2@1.0.0')).toBe(true);
      expect(logger.log.calledWith('plugin3@1.0.0')).toBe(true);
    });

    it('list should throw an exception if a plugin does not have a package.json', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      mkdirSync(join(pluginDir, 'empty-plugin'), { recursive: true });

      expect(function () {
        list(settings, logger);
      }).toThrowError('Unable to read package.json file for plugin empty-plugin');
    });

    it('list should throw an exception if a plugin have an empty package.json', function () {
      createPlugin('plugin1', '1.0.0', pluginDir);
      const invalidPluginDir = join(pluginDir, 'invalid-plugin');
      mkdirSync(invalidPluginDir, { recursive: true });
      appendFileSync(join(invalidPluginDir, 'package.json'), '');

      expect(function () {
        list(settings, logger);
      }).toThrowError('Unable to read package.json file for plugin invalid-plugin');
    });
  });
});
