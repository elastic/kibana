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

import { getActiveInspectFlag } from './get_active_inspect_flag';

const ACTIVE_INSPECT_FLAG = getActiveInspectFlag();

/**
 * Strip inspect-related flags from a NODE_OPTIONS string to prevent the child
 * process from inheriting them. The child gets its own inspect flag via
 * nodeOptions with an incremented port, so keeping the parent's flags would
 * cause port conflicts or unintended --inspect-wait hangs.
 */
function stripInspectFromNodeOptions(nodeOptions: string | undefined): string | undefined {
  if (!nodeOptions) {
    return nodeOptions;
  }

  return nodeOptions
    .replace(/--inspect(-brk|-wait)?(=\S+)?/g, '')
    .replace(/\s+/g, ' ')
    .trim() || undefined;
}

/**
 * Filter inspect-related flags from an execArgv-style array. Some Node.js
 * versions reflect NODE_OPTIONS into process.execArgv, so we need to strip
 * inspect flags from there too when the child gets its own inspect flag.
 */
function stripInspectFromExecArgv(args: string[]): string[] {
  return args.filter((arg) => !arg.match(/^--inspect(-brk|-wait)?(=|$)/));
}

interface ProcResource extends Rx.Unsubscribable {
  proc: execa.ExecaChildProcess;
  unsubscribe(): void;
}

interface Options {
  script: string;
  argv: string[];
  forceColor: boolean;
  env?: Record<string, string>;
}

export function usingServerProcess<T>(
  options: Options,
  fn: (proc: execa.ExecaChildProcess) => Rx.Observable<T>
) {
  return Rx.using(
    (): ProcResource => {
      const proc = execa.node(options.script, options.argv, {
        stdio: 'pipe',
        nodeOptions: [
          ...(ACTIVE_INSPECT_FLAG
            ? stripInspectFromExecArgv(process.execArgv)
            : process.execArgv),
          ...(ACTIVE_INSPECT_FLAG ? [`${ACTIVE_INSPECT_FLAG}=${process.debugPort + 1}`] : []),
        ],
        env: {
          ...process.env,
          NODE_OPTIONS: ACTIVE_INSPECT_FLAG
            ? stripInspectFromNodeOptions(process.env.NODE_OPTIONS)
            : process.env.NODE_OPTIONS,
          isDevCliChild: 'true',
          ELASTIC_APM_SERVICE_NAME: 'kibana',
          ...(options.forceColor ? { FORCE_COLOR: 'true' } : {}),
          ...options.env,
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
