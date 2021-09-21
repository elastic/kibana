/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spawnSync } from 'child_process';

import { REPO_ROOT } from '@kbn/dev-utils';

const INVALID_CONFIG_PATH = require.resolve('./__fixtures__/invalid_config.yml');

describe('cli invalid config support', function () {
  it(
    'exits with statusCode 64 and logs a single line when config is invalid',
    function () {
      // Unused keys only throw once LegacyService starts, so disable migrations so that Core
      // will finish the start lifecycle without a running Elasticsearch instance.
      const { error, status, stdout, stderr } = spawnSync(
        process.execPath,
        ['scripts/kibana', '--config', INVALID_CONFIG_PATH, '--migrations.skip=true'],
        {
          cwd: REPO_ROOT,
        }
      );

      let fatalLogLines;
      try {
        fatalLogLines = stdout.toString('utf8').split('\n').filter(Boolean);
        // .filter((line) => line.includes('[FATAL]'));
      } catch (e) {
        throw new Error(
          `error parsing log output:\n\n${e.stack}\n\nstdout: \n${stdout}\n\nstderr:\n${stderr}`
        );
      }

      expect(fatalLogLines).toEqual([]);

      expect(error).toBe(undefined);
      expect(fatalLogLines).toHaveLength(1);

      const fatalLogLine = fatalLogLines[0];

      expect(fatalLogLine).toContain(
        'Error: Unknown configuration key(s): "unknown.key", "other.unknown.key", "other.third", "some.flat.key", ' +
          '"some.array". Check for spelling errors and ensure that expected plugins are installed.'
      );

      expect(status).toBe(64);
    },
    20 * 1000
  );
});
