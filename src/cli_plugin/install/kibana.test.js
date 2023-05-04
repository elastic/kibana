/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import fs from 'fs';

import sinon from 'sinon';
import del from 'del';

import { existingInstall, assertVersion } from './kibana';
import { Logger } from '../../cli/logger';

jest.spyOn(fs, 'statSync');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('kibana cli', function () {
  describe('plugin installer', function () {
    describe('kibana', function () {
      const testWorkingPath = join(__dirname, '.test.data.kibana');
      const tempArchiveFilePath = join(testWorkingPath, 'archive.part');
      const pluginDir = join(__dirname, 'plugins');

      const settings = {
        workingPath: testWorkingPath,
        tempArchiveFile: tempArchiveFilePath,
        plugin: 'test-plugin',
        version: '1.0.0',
        plugins: [{ id: 'foo' }],
        pluginDir,
      };

      const logger = new Logger(settings);

      describe('assertVersion', function () {
        beforeEach(function () {
          del.sync(testWorkingPath);
          fs.mkdirSync(testWorkingPath, { recursive: true });
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function () {
          logger.log.restore();
          logger.error.restore();
          del.sync(testWorkingPath);
        });

        it('should succeed with exact match', function () {
          const settings = {
            workingPath: testWorkingPath,
            tempArchiveFile: tempArchiveFilePath,
            plugin: 'test-plugin',
            version: '5.0.0-SNAPSHOT',
            plugins: [
              {
                id: 'foo',
                kibanaVersion: '5.0.0-SNAPSHOT',
              },
            ],
          };

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should throw an error if plugin is missing a kibana version.', function () {
          expect(() => assertVersion(settings)).toThrowErrorMatchingInlineSnapshot(
            `"Plugin kibana.json is missing both a version property (required) and a kibanaVersion property (optional)."`
          );
        });

        it('should throw an error if plugin kibanaVersion does not match kibana version', function () {
          settings.plugins[0].kibanaVersion = '1.2.3.4';

          expect(() => assertVersion(settings)).toThrowErrorMatchingInlineSnapshot(
            `"Plugin foo [1.2.3] is incompatible with Kibana [1.0.0]"`
          );
        });

        it('should not throw an error if plugin kibanaVersion matches kibana version', function () {
          settings.plugins[0].kibanaVersion = '1.0.0';

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should ignore version info after the dash in checks on valid version', function () {
          settings.plugins[0].kibanaVersion = '1.0.0-foo-bar-version-1.2.3';

          expect(() => assertVersion(settings)).not.toThrow();
        });

        it('should ignore version info after the dash in checks on invalid version', function () {
          settings.plugins[0].kibanaVersion = '2.0.0-foo-bar-version-1.2.3';

          expect(() => assertVersion(settings)).toThrowErrorMatchingInlineSnapshot(
            `"Plugin foo [2.0.0] is incompatible with Kibana [1.0.0]"`
          );
        });
      });

      describe('existingInstall', function () {
        let processExitStub;

        beforeEach(function () {
          processExitStub = sinon.stub(process, 'exit');
          sinon.stub(logger, 'log');
          sinon.stub(logger, 'error');
        });

        afterEach(function () {
          processExitStub.restore();
          logger.log.restore();
          logger.error.restore();
        });

        it('should throw an error if the plugin already exists.', function () {
          fs.statSync.mockImplementationOnce(() => true);
          existingInstall(settings, logger);
          expect(logger.error.firstCall.args[0]).toMatch(/already exists/);
          expect(process.exit.called).toBe(true);
        });

        it('should not throw an error if the plugin does not exist.', function () {
          fs.statSync.mockImplementationOnce(() => {
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
