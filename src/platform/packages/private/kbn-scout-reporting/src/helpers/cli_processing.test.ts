/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getRunCommand,
  getTestTargetFromProcessArguments,
  stripRunCommand,
} from './cli_processing';

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
        '--grep=@local-serverless-search',
      ];

      expect(stripRunCommand(argv)).toBe(
        'npx playwright test --config path/to/config --project local --grep=@local-serverless-search'
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
        '--grep=serverless-search',
      ];

      expect(stripRunCommand(argv)).toBe(
        'npx playwright test --config path/to/config --project local --grep=serverless-search'
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
        '--grep=@local-serverless-search',
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
        'node scripts/scout.js run-tests --arch serverless --domain observability_complete --config path/to/config';

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
        '--grep=@local-serverless-search',
      ];
      expect(getRunCommand(argv)).toBe(stripRunCommand(argv));
    });
  });

  describe('getTestTargetFromProcessArguments', () => {
    const originalScoutTargetEnv: Record<string, string | undefined> = {
      SCOUT_TARGET_LOCATION: process.env.SCOUT_TARGET_LOCATION,
      SCOUT_TARGET_ARCH: process.env.SCOUT_TARGET_ARCH,
      SCOUT_TARGET_DOMAIN: process.env.SCOUT_TARGET_DOMAIN,
    };

    const clearScoutTargetEnv = () => {
      Object.keys(originalScoutTargetEnv).forEach((k: string) => delete process.env[k]);
    };

    const restoreScoutTargetEnv = () => {
      Object.entries(originalScoutTargetEnv).forEach(([k, v]) => {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      });
    };

    afterEach(() => {
      restoreScoutTargetEnv();
    });

    it(`should return the correct mode for '--grep=@local-serverless-search' when env var is not set`, () => {
      clearScoutTargetEnv();
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep=@local-serverless-search',
      ];
      expect(getTestTargetFromProcessArguments(argv)?.tag).toBe('local-serverless-search');
    });

    it(`should return the correct mode for '--grep @cloud-serverless-search' when env var is not set`, () => {
      clearScoutTargetEnv();
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep',
        '@cloud-serverless-search',
      ];
      expect(getTestTargetFromProcessArguments(argv)?.tag).toBe('cloud-serverless-search');
    });

    it('returns correct arch and domain when grep is a full tag', () => {
      clearScoutTargetEnv();
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep=@local-stateful-classic',
      ];
      const target = getTestTargetFromProcessArguments(argv);
      expect(target).toBeDefined();
      expect(target?.arch).toBe('stateful');
      expect(target?.domain).toBe('classic');
      expect(target?.tag).toBe('local-stateful-classic');
    });

    it(`should return undefined for an invalid --grep tag when env var is not set`, () => {
      clearScoutTargetEnv();
      const argv = [
        'node',
        'scripts/scout.js',
        'run-tests',
        '--config',
        'path/to/config',
        '--grep=@invalidTag',
      ];
      expect(getTestTargetFromProcessArguments(argv)).toBeUndefined();
    });

    it(`should return undefined if --grep argument is not provided and env var is not set`, () => {
      clearScoutTargetEnv();
      const argv = ['node', 'scripts/scout.js'];
      expect(getTestTargetFromProcessArguments(argv)).toBeUndefined();
    });

    it(`should return undefined for '--grep=' when env var is not set`, () => {
      clearScoutTargetEnv();
      const argv = ['node', 'scripts/scout.js', '--grep='];
      expect(getTestTargetFromProcessArguments(argv)).toBeUndefined();
    });

    it(`should return undefined if '--grep' argument is without value when env var is not set`, () => {
      clearScoutTargetEnv();
      const argv = ['node', 'scripts/scout.js', '--grep'];
      expect(getTestTargetFromProcessArguments(argv)).toBeUndefined();
    });

    describe('when grep is a regex or partial tag (Playwright grep accepts regex)', () => {
      it('returns undefined when grep value is partial tag (arch-domain only, e.g. serverless-search)', () => {
        clearScoutTargetEnv();
        const argv = [
          'node',
          'scripts/scout.js',
          'run-tests',
          '--config',
          'path/to/config',
          '--grep=serverless-search',
        ];
        expect(getTestTargetFromProcessArguments(argv)).toBeUndefined();
      });

      it('returns undefined when grep value is a regex pattern', () => {
        clearScoutTargetEnv();
        const argv = [
          'node',
          'scripts/scout.js',
          'run-tests',
          '--config',
          'path/to/config',
          '--grep=@(local|cloud)-stateful-classic',
        ];
        expect(getTestTargetFromProcessArguments(argv)).toBeUndefined();
      });
    });
  });
});
