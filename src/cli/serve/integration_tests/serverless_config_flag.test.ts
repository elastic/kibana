/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { spawn, spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { filter, firstValueFrom, from, take, concatMap } from 'rxjs';

import { REPO_ROOT } from '@kbn/repo-info';
import { getConfigDirectory } from '@kbn/utils';

describe('cli serverless project type', () => {
  it(
    'exits with statusCode 1 and logs an error when serverless project type is invalid',
    () => {
      const { error, status, stdout } = spawnSync(
        process.execPath,
        ['scripts/kibana', '--serverless=non-existing-project-type'],
        {
          cwd: REPO_ROOT,
        }
      );
      expect(error).toBe(undefined);

      expect(stdout.toString('utf8')).toContain(
        'FATAL CLI ERROR Error: invalid --serverless value, must be one of es, oblt, security'
      );

      expect(status).toBe(1);
    },
    20 * 1000
  );

  // Skipping this one because on CI it fails to read the config file
  it.skip.each(['es', 'oblt', 'security'])(
    'writes the serverless project type %s in config/serverless.recent.yml',
    async (mode) => {
      // Making sure `--serverless` translates into the `serverless` config entry, and validates against the accepted values
      const child = spawn(process.execPath, ['scripts/kibana', `--serverless=${mode}`], {
        cwd: REPO_ROOT,
      });

      // Wait for 5 lines in the logs
      await firstValueFrom(from(child.stdout).pipe(take(5)));

      expect(
        readFileSync(resolve(getConfigDirectory(), 'serverless.recent.yml'), 'utf-8')
      ).toContain(`serverless: ${mode}\n`);

      child.kill('SIGKILL');
    }
  );

  it.each(['es', 'oblt', 'security'])(
    'Kibana does not crash when running project type %s',
    async (mode) => {
      const child = spawn(process.execPath, ['scripts/kibana', `--serverless=${mode}`], {
        cwd: REPO_ROOT,
      });

      // Wait until Kibana starts listening to the port
      let leftover = '';
      const found = await firstValueFrom(
        from(child.stdout).pipe(
          concatMap((chunk: Buffer) => {
            const data = leftover + chunk.toString('utf-8');
            const msgs = data.split('\n');
            leftover = msgs.pop() ?? '';
            return msgs;
          }),
          filter(
            (msg) =>
              msg.includes('http server running at http://localhost:5601') || msg.includes('FATAL')
          )
        )
      );

      child.kill('SIGKILL');

      expect(found).not.toContain('FATAL');
    }
  );
});
