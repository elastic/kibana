/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { fork, ChildProcess } from 'child_process';
import { Readable } from 'stream';
import { inspect } from 'util';

import * as Rx from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

import { isWorkerMsg, WorkerConfig, WorkerMsg, Bundle } from '../common';

import { OptimizerConfig } from './optimizer_config';

export interface WorkerStdio {
  type: 'worker stdio';
  stream: 'stdout' | 'stderr';
  chunk: Buffer;
}

export interface WorkerStarted {
  type: 'worker started';
  bundles: Bundle[];
}

export type WorkerStatus = WorkerStdio | WorkerStarted;

interface ProcResource extends Rx.Unsubscribable {
  proc: ChildProcess;
}
const isNumeric = (input: any) => String(input).match(/^[0-9]+$/);

let inspectPortCounter = 9230;
const inspectFlagIndex = process.execArgv.findIndex(flag => flag.startsWith('--inspect'));
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
  workerConfig: WorkerConfig,
  bundles: Bundle[],
  fn: (proc: ChildProcess) => Rx.Observable<T>
) {
  return Rx.using(
    (): ProcResource => {
      const args = [JSON.stringify(workerConfig), JSON.stringify(bundles.map(b => b.toSpec()))];

      const proc = fork(require.resolve('../worker/run_worker'), args, {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        execArgv: [
          ...(inspectFlag && config.inspectWorkers
            ? [`${inspectFlag}=${inspectPortCounter++}`]
            : []),
          ...(config.maxWorkerCount <= 3 ? ['--max-old-space-size=2048'] : []),
        ],
      });

      return {
        proc,
        unsubscribe() {
          proc.kill('SIGKILL');
        },
      };
    },

    resource => {
      const { proc } = resource as ProcResource;
      return fn(proc);
    }
  );
}

function observeStdio$(stream: Readable, name: WorkerStdio['stream']) {
  return Rx.fromEvent<Buffer>(stream, 'data').pipe(
    takeUntil(
      Rx.race(
        Rx.fromEvent<void>(stream, 'end'),
        Rx.fromEvent<Error>(stream, 'error').pipe(
          map(error => {
            throw error;
          })
        )
      )
    ),
    map(
      (chunk): WorkerStdio => ({
        type: 'worker stdio',
        chunk,
        stream: name,
      })
    )
  );
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
  return usingWorkerProc(config, workerConfig, bundles, proc => {
    let lastMsg: WorkerMsg;

    return Rx.merge(
      Rx.of({
        type: 'worker started',
        bundles,
      }),
      observeStdio$(proc.stdout, 'stdout'),
      observeStdio$(proc.stderr, 'stderr'),
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
                map(error => {
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
  });
}
