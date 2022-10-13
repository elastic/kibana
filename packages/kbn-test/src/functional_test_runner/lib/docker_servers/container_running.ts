/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import * as Rx from 'rxjs';
import { ToolingLog } from '@kbn/tooling-log';

/**
 * Create an observable that errors if a docker
 * container exits before being unsubscribed
 */
export function observeContainerRunning(name: string, containerId: string, log: ToolingLog) {
  return new Rx.Observable((subscriber) => {
    log.debug(`[docker:${name}] watching container for exit status [${containerId}]`);

    const exitCodeProc = execa('docker', ['wait', containerId]);

    let exitCode: Error | number | null = null;
    exitCodeProc
      .then(({ stdout }) => {
        exitCode = Number.parseInt(stdout.trim(), 10);

        if (Number.isFinite(exitCode)) {
          subscriber.error(
            new Error(`container [id=${containerId}] unexpectedly exitted with code ${exitCode}`)
          );
        } else {
          subscriber.error(
            new Error(`unable to parse exit code from output of "docker wait": ${stdout}`)
          );
        }
      })
      .catch((error) => {
        if (error?.killed) {
          // ignore errors thrown because the process was killed
          subscriber.complete();
          return;
        }

        subscriber.error(
          new Error(`failed to monitor process with "docker wait": ${error.message}`)
        );
      });

    return () => {
      exitCodeProc.kill('SIGKILL');
    };
  });
}
