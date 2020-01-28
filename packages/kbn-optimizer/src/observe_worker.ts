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

import { isWorkerMessage, WorkerMessage, WorkerConfig } from './common';
import { OptimizerConfig } from './optimizer_config';

export interface WorkerStdio {
  type: 'worker stdio';
  stream: 'stdout' | 'stderr';
  chunk: Buffer;
}

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
  worker: WorkerConfig,
  fn: (proc: ChildProcess) => Rx.Observable<T>
) {
  return Rx.using(
    (): ProcResource => {
      const proc = fork(require.resolve('./worker/run_worker'), [JSON.stringify(worker)], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        execArgv: [
          ...(inspectFlag && config.inspectWorkers
            ? [`${inspectFlag}=${inspectPortCounter++}`]
            : []),
          ...(config.workers.length <= 2 ? ['--max-old-space-size=2048'] : []),
        ],
        env: {
          ...process.env,
          BROWSERSLIST_ENV: worker.dist ? 'production' : process.env.BROWSERSLIST_ENV || 'dev',
        },
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

export function observeWorker(
  config: OptimizerConfig,
  worker: WorkerConfig
): Rx.Observable<WorkerMessage | WorkerStdio> {
  return usingWorkerProc(config, worker, proc => {
    let lastMessage: WorkerMessage;

    return Rx.merge(
      observeStdio$(proc.stdout!, 'stdout'),
      observeStdio$(proc.stderr!, 'stderr'),
      Rx.fromEvent<[unknown]>(proc, 'message')
        .pipe(
          // validate the messages from the process
          map(([msg]) => {
            if (!isWorkerMessage(msg)) {
              throw new Error(`unexpected message from worker: ${JSON.stringify(msg)}`);
            }

            lastMessage = msg;
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
                  const terminalMsgTypes: Array<WorkerMessage['type']> = [
                    'compiler error',
                    'worker error',
                  ];

                  if (!worker.watch) {
                    terminalMsgTypes.push('compiler issue', 'compiler success');
                  }

                  // verify that this is an expected exit state
                  if (code === 0 && lastMessage && terminalMsgTypes.includes(lastMessage.type)) {
                    // emit undefined so that takeUntil completes the observable
                    return;
                  }

                  throw new Error(
                    `worker exitted unexpectedly with code ${code} [last message: ${inspect(
                      lastMessage
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
