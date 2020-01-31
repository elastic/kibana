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

jest.mock('fs', () => ({
  statSync: jest.fn().mockImplementation(() => require('fs').statSync),
  unlinkSync: jest.fn().mockImplementation(() => require('fs').unlinkSync),
  mkdirSync: jest.fn().mockImplementation(() => require('fs').mkdirSync),
}));

import sinon from 'sinon';
import Logger from '../lib/logger';
import { join } from 'path';
import rimraf from 'rimraf';
import fs from 'fs';
import { existingInstall, assertVersion } from './kibana';

describe('kibana cli', function() {
  describe('plugin installer', function() {
    describe('kibana', function() {
      const testWorkingPath = join(__dirname, '.test.data.kibana');
      const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
      const pluginDir = join(__dirname, 'plugins');

      const settings = {
        workingPath: testWorkingPath,
        tempArchiveFile: tempArchiveFilePath,
        plugin: 'test-plugin',
        version: '1.0.0',
        plugins: [{ name: 'foo' }],
        pluginDir,
      };

      const logger = new Logger(settings);

      describe('assertVersion', function() {
        beforeEach(function() {
          rimraf.sync(testWorkingPath);
          fs.mkdirSync(testWorkingPath, { recursive: true });
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function() {
          logger.log.restore();
          logger.error.restore();
          rimraf.sync(testWorkingPath);
        });

        it('should succeed with exact match', function() {
          const settings = {
            workingPath: testWorkingPath,
            tempArchiveFile: tempArchiveFilePath,
            plugin: 'test-plugin',
            version: '5.0.0-SNAPSHOT',
            plugins: [
              { name: 'foo', path: join(testWorkingPath, 'foo'), kibanaVersion: '5.0.0-SNAPSHOT' },
            ],
          };

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should throw an error if plugin is missing a kibana version.', function() {
          expect(() => assertVersion(settings)).toThrow(
            /plugin package\.json is missing both a version property/i
          );
        });

        it('should throw an error if plugin kibanaVersion does not match kibana version', function() {
          settings.plugins[0].kibanaVersion = '1.2.3.4';

          expect(() => assertVersion(settings)).toThrow(/incompatible with Kibana/i);
        });

        it('should not throw an error if plugin kibanaVersion matches kibana version', function() {
          settings.plugins[0].kibanaVersion = '1.0.0';

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should ignore version info after the dash in checks on valid version', function() {
          settings.plugins[0].kibanaVersion = '1.0.0-foo-bar-version-1.2.3';

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should ignore version info after the dash in checks on invalid version', function() {
          settings.plugins[0].kibanaVersion = '2.0.0-foo-bar-version-1.2.3';

          expect(() => assertVersion(settings)).toThrow(/incompatible with Kibana/i);
        });
      });

      describe('existingInstall', function() {
        let processExitStub;

        beforeEach(function() {
          processExitStub = sinon.stub(process, 'exit');
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function() {
          processExitStub.restore();
          logger.log.restore();
          logger.error.restore();
        });

        it('should throw an error if the plugin already exists.', function() {
          fs.statSync = jest.fn().mockImplementationOnce(() => true);
          existingInstall(settings, logger);
          expect(logger.error.firstCall.args[0]).toMatch(/already exists/);
          expect(process.exit.called).toBe(true);
        });

        it('should not throw an error if the plugin does not exist.', function() {
          fs.statSync = jest.fn().mockImplementationOnce(() => {
            throw { code: 'ENOENT' };
          });
          existingInstall(settings, logger);
          expect(logger.error.called).toBe(false);
        });
      });
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
});
