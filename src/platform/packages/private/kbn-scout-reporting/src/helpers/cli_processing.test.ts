/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRunCommand, getRunTarget, stripRunCommand } from './cli_processing';

describe('cli_processing', () => {
  describe('stripRunCommand', () => {
    it(`should return the correct run command when started with 'npx'`, () => {
      const argv = [
        'npx',
        'playwright',
        'test',
        '--config',
        'path/to/config',
        '--project',
        'local',
        '--grep=@svlSearch',
      ];

      expect(stripRunCommand(argv)).toBe(
        'npx playwright test --config path/to/config --project local --grep=@svlSearch'
      );
    });

    it(`should return the correct run command when started with 'node'`, () => {
      const argv = [
        '/Users/user/.nvm/versions/node/v20.15.1/bin/node',
        'node_modules/.bin/playwright',
        'test',
        '--config',
        'path/to/config',
        '--project',
        'local',
        '--grep=@svlSearch',
      ];

      expect(stripRunCommand(argv)).toBe(
        'npx playwright test --config path/to/config --project local --grep=@svlSearch'
      );
    });

    it(`should throw error if command has less than 3 arguments`, () => {
      const argv = [
        '/Users/user/.nvm/versions/node/v20.15.1/bin/node',
        'node_modules/.bin/playwright',
      ];
      expect(() => stripRunCommand(argv)).toThrow(
        /Invalid command arguments: must include at least 'npx playwright test'/
      );
    });

    it(`should throw error if command does not start with 'node' or 'npx'`, () => {
      const argv = [
        'node_modules/.bin/playwright',
        'test',
        '--config',
        'path/to/config',
        '--grep=@svlSearch',
      ];
      expect(() => stripRunCommand(argv)).toThrow(
        /Invalid command structure: Expected "node <playwright_path> test" or "npx playwright test"/
      );
    });
  });

  describe('getRunCommand', () => {
    const originalEnv = process.env.SCOUT_RUN_COMMAND;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.SCOUT_RUN_COMMAND;
      } else {
        process.env.SCOUT_RUN_COMMAND = originalEnv;
      }
    });

    it(`should prefer SCOUT_RUN_COMMAND when provided`, () => {
      process.env.SCOUT_RUN_COMMAND =
        'node scripts/scout.js run-tests --serverless=oblt --config path/to/config';

      const argv = [
        'npx',
        'playwright',
        'test',
        '--config',
        'path/to/config',
        '--project',
        'local',
      ];
      expect(getRunCommand(argv)).toBe(process.env.SCOUT_RUN_COMMAND);
    });

    it(`should fall back to stripRunCommand when SCOUT_RUN_COMMAND is not set`, () => {
      delete process.env.SCOUT_RUN_COMMAND;
      const argv = [
        'npx',
        'playwright',
        'test',
        '--config',
        'path/to/config',
        '--project',
        'local',
        '--grep=@svlSearch',
      ];
      expect(getRunCommand(argv)).toBe(stripRunCommand(argv));
    });
  });

  describe('getRunTarget', () => {
    const originalEnv = process.env.SCOUT_TARGET_MODE;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.SCOUT_TARGET_MODE;
      } else {
        process.env.SCOUT_TARGET_MODE = originalEnv;
      }
    });

    it(`should return the correct mode from SCOUT_TARGET_MODE environment variable`, () => {
      process.env.SCOUT_TARGET_MODE = 'stateful';
      expect(getRunTarget()).toBe('stateful');
    });

    it(`should convert serverless=oblt to serverless-oblt from environment variable`, () => {
      process.env.SCOUT_TARGET_MODE = 'serverless=oblt';
      expect(getRunTarget()).toBe('serverless-oblt');
    });

    it(`should convert serverless=es to serverless-es from environment variable`, () => {
      process.env.SCOUT_TARGET_MODE = 'serverless=es';
      expect(getRunTarget()).toBe('serverless-es');
    });

    it(`should convert serverless=oblt-logs-essentials to serverless-oblt-logs-essentials from environment variable`, () => {
      process.env.SCOUT_TARGET_MODE = 'serverless=oblt-logs-essentials';
      expect(getRunTarget()).toBe('serverless-oblt-logs-essentials');
    });

    it(`should return the correct mode for '--grep=@svlSearch' when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep=@svlSearch',
      ];
      expect(getRunTarget(argv)).toBe('serverless-search');
    });

    it(`should return the correct mode for '--grep @svlSearch' when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep',
        '@svlSearch',
      ];
      expect(getRunTarget(argv)).toBe('serverless-search');
    });

    it(`should return the correct mode for '--grep=@svlSecurity' when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = [
        'node_modules/.bin/playwright',
        'test',
        '--project',
        'local',
        '--grep=@svlSecurity',
        '--config',
        'path/to/config',
      ];
      expect(getRunTarget(argv)).toBe('serverless-security');
    });

    it(`should return the correct mode for '--grep @svlSecurity' when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = [
        'node_modules/.bin/playwright',
        'test',
        '--project',
        'local',
        '--grep',
        '@svlSecurity',
        '--config',
        'path/to/config',
      ];
      expect(getRunTarget(argv)).toBe('serverless-security');
    });

    it(`should return 'undefined' for an invalid --grep tag when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep=@invalidTag',
      ];
      expect(getRunTarget(argv)).toBe('undefined');
    });

    it(`should return 'undefined' if --grep argument is not provided and env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = ['node', 'scripts/scout.js'];
      expect(getRunTarget(argv)).toBe('undefined');
    });

    it(`should return 'undefined' for '--grep=' when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = ['node', 'scripts/scout.js', '--grep='];
      expect(getRunTarget(argv)).toBe('undefined');
    });

    it(`should return 'undefined' if '--grep' argument is without value when env var is not set`, () => {
      delete process.env.SCOUT_TARGET_MODE;
      const argv = ['node', 'scripts/scout.js', '--grep'];
      expect(getRunTarget(argv)).toBe('undefined');
    });
  });
});
