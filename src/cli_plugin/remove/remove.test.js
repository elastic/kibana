/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { writeFileSync, existsSync, mkdirSync, mkdtempSync } from 'fs';

import sinon from 'sinon';
import globby from 'globby';
import del from 'del';

import { Logger } from '../../cli/logger';
import { remove } from './remove';

describe('kibana cli', function () {
  describe('plugin remover', function () {
    const basePluginDir = join(__dirname, '.test.data.remove');
    let pluginDir;
    let processExitStub;
    let logger;

    let settings;

    beforeEach(function () {
      // Create a fresh, unique directory for each test run
      del.sync(basePluginDir);
      mkdirSync(basePluginDir, { recursive: true });
      pluginDir = mkdtempSync(join(basePluginDir, 'run-'));

      settings = { pluginDir };

      processExitStub = sinon.stub(process, 'exit');
      logger = new Logger(settings);
      sinon.stub(logger, 'log');
      sinon.stub(logger, 'error');
    });

    afterEach(function () {
      processExitStub.restore();
      logger.log.restore();
      logger.error.restore();
      del.sync(basePluginDir);
    });

    it('throw an error if the plugin is not installed.', function () {
      settings.pluginPath = join(pluginDir, 'foo');
      settings.plugin = 'foo';

      remove(settings, logger);
      expect(logger.error.firstCall.args[0]).toMatch(/not installed/);
      expect(process.exit.called).toBe(true);
    });

    it('throw an error if the specified plugin is not a folder.', function () {
      // Simulate a non-directory file at the plugin path
      settings.pluginPath = join(pluginDir, 'foo');
      settings.plugin = 'foo';
      writeFileSync(settings.pluginPath, 'This is a file, and not a folder.');

      remove(settings, logger);
      expect(logger.error.firstCall.args[0]).toMatch(/not a plugin/);
      expect(process.exit.called).toBe(true);
    });

    it('remove x-pack if it exists', () => {
      settings.pluginPath = join(pluginDir, 'x-pack');
      settings.plugin = 'x-pack';
      mkdirSync(join(pluginDir, 'x-pack'), { recursive: true });
      expect(existsSync(settings.pluginPath)).toEqual(true);
      remove(settings, logger);
      expect(existsSync(settings.pluginPath)).toEqual(false);
    });

    it('distribution error if x-pack does not exist', () => {
      settings.pluginPath = join(pluginDir, 'x-pack');
      settings.plugin = 'x-pack';
      expect(existsSync(settings.pluginPath)).toEqual(false);
      remove(settings, logger);
      expect(logger.error.getCall(0).args[0]).toMatch(
        /Please install the OSS-only distribution to remove X-Pack features/
      );
    });

    it('delete the specified folder.', function () {
      // Create two sibling entries: we will remove only "foo"
      settings.pluginPath = join(pluginDir, 'foo');
      settings.plugin = 'foo';
      mkdirSync(settings.pluginPath, { recursive: true });
      mkdirSync(join(pluginDir, 'bar'), { recursive: true });

      remove(settings, logger);
      const files = globby.sync('**/*', { cwd: pluginDir, onlyFiles: false });
      const expected = ['bar'];
      expect(files.sort()).toEqual(expected.sort());
    });
  });
});
