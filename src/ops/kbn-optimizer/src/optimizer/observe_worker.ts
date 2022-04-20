/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import execa from 'execa';
import * as Rx from 'rxjs';
import { map, takeUntil, first, ignoreElements } from 'rxjs/operators';

import { isWorkerMsg, WorkerConfig, WorkerMsg, Bundle, BundleRefs } from '../common';

import { observeStdio$ } from './observe_stdio';
import { OptimizerConfig } from './optimizer_config';

export interface WorkerStdio {
  type: 'worker stdio';
  stream: 'stdout' | 'stderr';
  line: string;
}

export interface WorkerStarted {
  type: 'worker started';
  bundles: Bundle[];
}

export type WorkerStatus = WorkerStdio | WorkerStarted;

interface ProcResource extends Rx.Unsubscribable {
  proc: execa.ExecaChildProcess;
}
const isNumeric = (input: any) => String(input).match(/^[0-9]+$/);

let inspectPortCounter = 9230;
const inspectFlagIndex = process.execArgv.findIndex((flag) => flag.startsWith('--inspect'));
let inspectFlag: string | undefined;
if (inspectFlagIndex !== -1) {
  const argv = process.execArgv[inspectFlagIndex];
  if (argv.includes('=')) {
    // --inspect=port
    const [flag, port] = argv.split('=');
    inspectFlag = flag;
    inspectPortCounter = Number.parseInt(port, 10) + 1;
  } else {
    // --inspect
    inspectFlag = argv;
    if (isNumeric(process.execArgv[inspectFlagIndex + 1])) {
      // --inspect port
      inspectPortCounter = Number.parseInt(process.execArgv[inspectFlagIndex + 1], 10) + 1;
    }
  }
}

function usingWorkerProc<T>(
  config: OptimizerConfig,
  fn: (proc: execa.ExecaChildProcess) => Rx.Observable<T>
) {
  return Rx.using(
    (): ProcResource => {
      const workerPath = require.resolve('../worker/run_worker');
      const proc = execa.node(
        workerPath.endsWith('.ts')
          ? require.resolve('../worker/run_worker_from_source') // workerFromSourcePath
          : workerPath,
        [],
        {
          nodeOptions: [
            '--preserve-symlinks',
            '--preserve-symlinks-main',
            ...(inspectFlag && config.inspectWorkers
              ? [`${inspectFlag}=${inspectPortCounter++}`]
              : []),
            ...(config.maxWorkerCount <= 3 ? ['--max-old-space-size=2048'] : []),
          ],
          buffer: false,
          stderr: 'pipe',
          stdout: 'pipe',
        }
      );

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

/**
 * We used to pass configuration to the worker as JSON encoded arguments, but they
 * grew too large for argv, especially on Windows, so we had to move to an async init
 * where we send the args over IPC. To keep the logic simple we basically mock the
 * argv behavior and don't use complicated messages or anything so that state can
 * be initialized in the worker before most of the code is run.
 */
function initWorker(
  proc: execa.ExecaChildProcess,
  config: OptimizerConfig,
  workerConfig: WorkerConfig,
  bundles: Bundle[]
) {
  const msg$ = Rx.fromEvent<[unknown]>(proc, 'message').pipe(
    // validate the initialization messages from the process
    map(([msg]) => {
      if (typeof msg === 'string') {
        switch (msg) {
          case 'init':
            return 'init' as const;
          case 'ready':
            return 'ready' as const;
        }
      }

      throw new Error(`unexpected message from worker while initializing: [${inspect(msg)}]`);
    })
  );

  return Rx.concat(
    msg$.pipe(first((msg) => msg === 'init')),
    Rx.defer(() => {
      proc.send({
        args: [
          JSON.stringify(workerConfig),
          JSON.stringify(bundles.map((b) => b.toSpec())),
          BundleRefs.fromBundles(config.bundles).toSpecJson(),
        ],
      });
      return [];
    }),
    msg$.pipe(first((msg) => msg === 'ready'))
  ).pipe(ignoreElements());
}

/**
 * Start a worker process with the specified `workerConfig` and
 * `bundles` and return an observable of the events related to
 * that worker, including the messages sent to us by that worker
 * and the status of the process (stdio, started).
 */
export function observeWorker(
  config: OptimizerConfig,
  workerConfig: WorkerConfig,
  bundles: Bundle[]
): Rx.Observable<WorkerMsg | WorkerStatus> {
  return usingWorkerProc(config, (proc) => {
    const init$ = initWorker(proc, config, workerConfig, bundles);

    let lastMsg: WorkerMsg;
    const worker$: Rx.Observable<WorkerMsg | WorkerStatus> = Rx.merge(
      Rx.of({
        type: 'worker started' as const,
        bundles,
      }),
      // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
      observeStdio$(proc.stdout!).pipe(
        map(
          (line): WorkerStdio => ({
            type: 'worker stdio',
            line,
            stream: 'stdout',
          })
        )
      ),
      // TypeScript note: As long as the proc stdio[2] is 'pipe', then stderr will not be null
      observeStdio$(proc.stderr!).pipe(
        map(
          (line): WorkerStdio => ({
            type: 'worker stdio',
            line,
            stream: 'stderr',
          })
        )
      ),
      Rx.fromEvent<[unknown]>(proc, 'message')
        .pipe(
          // validate the messages from the process
          map(([msg]) => {
            if (!isWorkerMsg(msg)) {
              throw new Error(`unexpected message from worker: ${JSON.stringify(msg)}`);
            }

            lastMsg = msg;
            return msg;
          })
        )
        .pipe(
          takeUntil(
            Rx.race(
              // throw into stream on error events
              Rx.fromEvent<Error>(proc, 'error').pipe(
                map((error) => {
                  throw new Error(`worker failed to spawn: ${error.message}`);
                })
              ),

              // throw into stream on unexpected exits, or emit to trigger the stream to close
              Rx.fromEvent<[number | void]>(proc, 'exit').pipe(
                map(([code]) => {
                  const terminalMsgTypes: Array<WorkerMsg['type']> = [
                    'compiler error',
                    'worker error',
                  ];

                  if (!config.watch) {
                    terminalMsgTypes.push('compiler issue', 'compiler success');
                  }

                  // verify that this is an expected exit state
                  if (code === 0 && lastMsg && terminalMsgTypes.includes(lastMsg.type)) {
                    // emit undefined so that takeUntil completes the observable
                    return;
                  }

                  throw new Error(
                    `worker exitted unexpectedly with code ${code} [last message: ${inspect(
                      lastMsg
                    )}]`
                  );
                })
              )
            )
          )
        )
    );

    return Rx.concat(init$, worker$);
  });
}
