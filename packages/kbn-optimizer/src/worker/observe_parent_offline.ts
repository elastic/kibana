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

import { EventEmitter } from 'events';

import * as Rx from 'rxjs';
import { mergeMap, take, first, map, catchError } from 'rxjs/operators';

import { isParentPong, WorkerMsgs } from '../common';

const sleep = (ms: number) => Rx.timer(ms).pipe(take(1));

export interface Process extends EventEmitter {
  connected?: boolean;
  send?: (msg: any) => void;
}

/**
 * Returns an observable that will emit a value when the parent
 * process goes offline. It accomplishes this by merging several
 * signals:
 *
 *  1. process "disconnect" event
 *  2. process.connected or process.send are falsy
 *  3. a ping was sent to the parent process but it didn't respond
 *     with a pong within 5 seconds
 *  4. a ping was sent to the parent process but the process.send
 *     call errored with an 'ERR_IPC_CHANNEL_CLOSED' exception
 */
export function observeParentOffline(process: Process, workerMsgs: WorkerMsgs) {
  return Rx.race(
    Rx.fromEvent(process, 'disconnect').pipe(
      take(1),
      map(() => 'parent offline (disconnect event)')
    ),

    sleep(5000).pipe(
      mergeMap(() => {
        if (!process.connected || !process.send) {
          return Rx.of('parent offline (disconnected)');
        }

        process.send(workerMsgs.ping());

        const pong$ = Rx.fromEvent<[any]>(process, 'message').pipe(
          first(([msg]) => isParentPong(msg)),
          map(() => {
            throw new Error('parent still online');
          })
        );

        // give the parent some time to respond, if the ping
        // wins the race the parent is considered online
        const timeout$ = sleep(5000).pipe(map(() => 'parent offline (ping timeout)'));

        return Rx.race(pong$, timeout$);
      })
    )
  ).pipe(
    /**
     * resubscribe to the source observable (triggering the timer,
     * ping, wait for response) if the source observable does not
     * observe the parent being offline yet.
     *
     * Scheduling the interval this way prevents the ping timeout
     * from overlaping with the interval by only scheduling the
     * next ping once the previous ping has completed
     */
    catchError((error, resubscribe) => {
      if (error.code === 'ERR_IPC_CHANNEL_CLOSED') {
        return Rx.of('parent offline (ipc channel exception)');
      }

      if (error.message === 'parent still online') {
        return resubscribe;
      }

      throw error;
    })
  );
}
