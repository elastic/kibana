/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import * as Rx from 'rxjs';

import { getActiveInspectFlag } from './get_active_inspect_flag';

const ACTIVE_INSPECT_FLAG = getActiveInspectFlag();

interface ProcResource extends Rx.Unsubscribable {
  proc: execa.ExecaChildProcess;
  unsubscribe(): void;
}

export function usingServerProcess<T>(
  script: string,
  argv: string[],
  fn: (proc: execa.ExecaChildProcess) => Rx.Observable<T>
) {
  return Rx.using(
    (): ProcResource => {
      const proc = execa.node(script, argv, {
        stdio: 'pipe',
        nodeOptions: [
          ...process.execArgv,
          ...(ACTIVE_INSPECT_FLAG ? [`${ACTIVE_INSPECT_FLAG}=${process.debugPort + 1}`] : []),
        ],
        env: {
          ...process.env,
          NODE_OPTIONS: process.env.NODE_OPTIONS,
          isDevCliChild: 'true',
          ...(process.stdout.isTTY ? { FORCE_COLOR: 'true' } : {}),
        },
      });

      return {
        proc,
        unsubscribe() {
          proc.kill('SIGKILL');
        },
      };
    },

    (resource) => {
      const { proc } = resource as ProcResource;
      return fn(proc);
    }
  );
}
