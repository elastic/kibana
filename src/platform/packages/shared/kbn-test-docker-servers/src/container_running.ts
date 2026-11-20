/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import * as Rx from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Errors if the container exits on its own; completes when the watcher is unsubscribed (the
 * container is being stopped on purpose).
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
        if (error?.killed || error?.signal || error?.exitCode === 130 || error?.exitCode === 143) {
          // The monitor itself was stopped: by us (`kill`), or by a signal that reached it as
          // part of the process group (a terminal Ctrl-C exits `docker wait` with 130). That
          // says nothing about the container, and the run is being shut down anyway.
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
