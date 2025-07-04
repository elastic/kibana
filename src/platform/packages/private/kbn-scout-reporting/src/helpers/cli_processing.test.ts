/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRunTarget, stripRunCommand } from './cli_processing';

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

  describe('getRunTarget', () => {
    it(`should return the correct mode for '--grep=@svlSearch'`, () => {
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

    it(`should return the correct mode for '--grep @svlSearch'`, () => {
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

    it(`should return 'undefined' for an invalid --grep tag`, () => {
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

    it(`should return 'undefined' if --grep argument is not provided`, () => {
      const argv = ['node', 'scripts/scout.js'];
      expect(getRunTarget(argv)).toBe('undefined');
    });

    it(`should return 'undefined' for '--grep='`, () => {
      const argv = ['node', 'scripts/scout.js', '--grep='];
      expect(getRunTarget(argv)).toBe('undefined');
    });

    it(`should return 'undefined' if '--grep' argument is without value`, () => {
      const argv = ['node', 'scripts/scout.js', '--grep'];
      expect(getRunTarget(argv)).toBe('undefined');
    });
  });
});
