/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spawnSync } from 'child_process';

import { REPO_ROOT } from '@kbn/repo-info';

interface LogEntry {
  message: string;
  log: {
    level: string;
  };
}

const consoleJsonLog = JSON.stringify({
  root: { level: 'fatal', appenders: ['console-json'] },
  appenders: { 'console-json': { type: 'console', layout: { type: 'json' } } },
});

describe('cli serverless project type', () => {
  it(
    'exits with statusCode 78 and logs an error when serverless project type is invalid',
    () => {
      // Making sure `--serverless` translates into the `serverless` config entry, and validates against the accepted values
      const { error, status, stdout, stderr } = spawnSync(
        process.execPath,
        ['scripts/kibana', '--serverless=non-existing-project-type', `--logging=${consoleJsonLog}`],
        {
          cwd: REPO_ROOT,
        }
      );
      expect(error).toBe(undefined);

      let fatalLogEntries;
      try {
        fatalLogEntries = stdout
          .toString('utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as LogEntry)
          .filter((line) => line.log.level === 'FATAL');
      } catch (e) {
        throw new Error(
          `error parsing log output:\n\n${e.stack}\n\nstdout: \n${stdout}\n\nstderr:\n${stderr}`
        );
      }

      expect(fatalLogEntries).toHaveLength(1);
      expect(fatalLogEntries[0].message).toContain(
        '[config validation of [serverless]]: types that failed validation'
      );

      expect(status).toBe(78);
    },
    20 * 1000
  );
});
