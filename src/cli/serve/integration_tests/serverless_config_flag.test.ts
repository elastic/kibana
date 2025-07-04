/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawn, spawnSync, ChildProcessWithoutNullStreams } from 'child_process';
import type { Readable } from 'stream';
import { filter, firstValueFrom, from, concatMap } from 'rxjs';

import { REPO_ROOT } from '@kbn/repo-info';

// Failing: See https://github.com/elastic/kibana/issues/163257
// Failing: See https://github.com/elastic/kibana/issues/163258
// Failing: See https://github.com/elastic/kibana/issues/163259
describe.skip('cli serverless project type', () => {
  let child: ChildProcessWithoutNullStreams | undefined;

  afterEach(() => {
    child?.kill('SIGKILL');
    child = undefined;
  });

  async function waitForMessage(stream: Readable, expectedMsg: string) {
    let leftover = '';
    return await firstValueFrom(
      from(stream).pipe(
        concatMap((chunk: Buffer) => {
          const data = leftover + chunk.toString('utf-8');
          const msgs = data.split('\n');
          leftover = msgs.pop() ?? '';
          return msgs;
        }),
        filter((msg) => msg.includes(expectedMsg) || msg.includes('FATAL'))
      )
    );
  }

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
        'FATAL CLI ERROR Error: invalid --serverless value, must be one of es, oblt, security'
      );

      expect(status).toBe(1);
    },
    20 * 1000
  );

  it.each(['es', 'oblt', 'security'])(
    'Kibana does not crash when running project type %s',
    async (mode) => {
      child = spawn(process.execPath, ['scripts/kibana', `--serverless=${mode}`], {
        cwd: REPO_ROOT,
      });

      // Wait until Kibana starts listening to the port
      const found = await waitForMessage(
        child.stdout,
        'http server running at http://localhost:5601'
      );
      expect(found).not.toContain('FATAL');
    }
  );
});
