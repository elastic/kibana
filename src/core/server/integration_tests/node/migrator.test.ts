/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ChildProcess from 'child_process';
import Path from 'path';

import * as Rx from 'rxjs';

import { ToolingLog } from '@kbn/tooling-log';
import { createTestEsCluster, kibanaServerTestUser } from '@kbn/test';
import { observeLines } from '@kbn/stdio-dev-helpers';
import { REPO_ROOT } from '@kbn/repo-info';

describe('migrator-only node', () => {
  const log = new ToolingLog({ writeTo: process.stdout, level: 'debug' });
  log.indent(4);
  const es = createTestEsCluster({ log });
  jest.setTimeout(100_000 + es.getStartTimeout());

  it('starts Kibana, runs migrations and then exits with a "0" status code', async () => {
    const expectedLog = /Detected migrator node role/;

    let proc: undefined | ChildProcess.ChildProcess;
    let logsSub: undefined | Rx.Subscription;
    try {
      await es.start();

      proc = ChildProcess.spawn(
        process.execPath,
        [
          Path.resolve(REPO_ROOT, './scripts/kibana.js'),
          `--elasticsearch.username=${kibanaServerTestUser.username}`,
          `--elasticsearch.password=${kibanaServerTestUser.password}`,
          '--elasticsearch.hosts=http://localhost:9220',
          '--node.roles=["migrator"]',
          '--no-optimizer',
          '--no-base-path',
          '--no-watch',
          '--oss',
        ],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );

      let sawExpectedLog = false;

      logsSub = Rx.merge(
        observeLines(proc.stdout!).pipe(
          Rx.tap((line) => {
            log.debug(line);
            if (!sawExpectedLog) sawExpectedLog = expectedLog.test(line);
          })
        ),
        observeLines(proc.stderr!).pipe(
          Rx.tap((line) => {
            log.error(line);
          })
        )
      ).subscribe();

      const [exitCode] = await Rx.firstValueFrom(
        Rx.race(
          Rx.fromEvent<[number, unknown]>(proc, 'exit'),
          Rx.fromEvent<never>(proc, 'error').pipe(
            Rx.map((error) => {
              throw error;
            })
          )
        )
      );

      expect(sawExpectedLog).toBe(true);
      expect(exitCode).toBe(0);
    } finally {
      logsSub?.unsubscribe();
      await es.stop();
      if (proc?.exitCode == null) proc?.kill(1);
    }
  });
});
