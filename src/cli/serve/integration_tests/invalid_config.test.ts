/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { spawnSync } from 'child_process';

import { REPO_ROOT } from '@kbn/dev-utils';

const INVALID_CONFIG_PATH = require.resolve('./__fixtures__/invalid_config.yml');

interface LogEntry {
  message: string;
  tags: string[];
  type: string;
}

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

      const [fatalLogLine] = stdout
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as LogEntry)
        .filter((line) => line.tags.includes('fatal'))
        .map((obj) => ({
          ...obj,
          pid: '## PID ##',
          '@timestamp': '## @timestamp ##',
          error: '## Error with stack trace ##',
        }));

      expect(error).toBe(undefined);

      if (!fatalLogLine) {
        throw new Error(
          `cli did not log the expected fatal error message:\n\nstdout: \n${stdout}\n\nstderr:\n${stderr}`
        );
      }

      expect(fatalLogLine.message).toContain(
        'Error: Unknown configuration key(s): "unknown.key", "other.unknown.key", "other.third", "some.flat.key", ' +
          '"some.array". Check for spelling errors and ensure that expected plugins are installed.'
      );
      expect(fatalLogLine.tags).toEqual(['fatal', 'root']);
      expect(fatalLogLine.type).toEqual('log');

      expect(status).toBe(64);
    },
    20 * 1000
  );
});
