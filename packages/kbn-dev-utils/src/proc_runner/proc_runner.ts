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

import moment from 'moment';
import * as Rx from 'rxjs';
import { filter, first, catchError, map } from 'rxjs/operators';
import exitHook from 'exit-hook';

import { ToolingLog } from '../tooling_log';
import { createCliError } from './errors';
import { Proc, ProcOptions, startProc } from './proc';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const noop = () => {};

interface RunOptions extends ProcOptions {
  wait: true | RegExp;
  waitTimeout?: number | false;
}

/**
 *  Helper for starting and managing processes. In many ways it resembles the
 *  API from `grunt_run`, processes are named and can be started, waited for,
 *  backgrounded once they log something matching a RegExp...
 *
 *  @class ProcRunner
 */
export class ProcRunner {
  private closing = false;
  private procs: Proc[] = [];
  private signalUnsubscribe: () => void;

  constructor(private log: ToolingLog) {
    this.signalUnsubscribe = exitHook(() => {
      this.teardown().catch((error) => {
        log.error(`ProcRunner teardown error: ${error.stack}`);
      });
    });
  }

  /**
   *  Start a process, tracking it by `name`
   *  @param  {String}  name
   *  @param  {Object}  options
   *  @property {String} options.cmd executable to run
   *  @property {Array<String>?} options.args arguments to provide the executable
   *  @property {String?} options.cwd current working directory for the process
   *  @property {RegExp|Boolean} options.wait Should start() wait for some time? Use
   *                                          `true` will wait until the proc exits,
   *                                          a `RegExp` will wait until that log line
   *                                          is found
   *  @return {Promise<undefined>}
   */
  async run(name: string, options: RunOptions) {
    const {
      cmd,
      args = [],
      cwd = process.cwd(),
      stdin = undefined,
      wait = false,
      waitTimeout = 15 * MINUTE,
      env = process.env,
    } = options;

    if (this.closing) {
      throw new Error('ProcRunner is closing');
    }

    if (wait && !(wait instanceof RegExp) && wait !== true) {
      throw new TypeError('wait param should either be a RegExp or `true`');
    }

    if (!!this.getProc(name)) {
      throw new Error(`Process with name "${name}" already running`);
    }

    const proc = this.startProc(name, {
      cmd,
      args,
      cwd,
      env,
      stdin,
    });

    try {
      if (wait instanceof RegExp) {
        // wait for process to log matching line
        await Rx.race(
          proc.lines$.pipe(
            filter((line) => wait.test(line)),
            first(),
            catchError((err) => {
              if (err.name !== 'EmptyError') {
                throw createCliError(`[${name}] exited without matching pattern: ${wait}`);
              } else {
                throw err;
              }
            })
          ),
          waitTimeout === false
            ? Rx.NEVER
            : Rx.timer(waitTimeout).pipe(
                map(() => {
                  const sec = waitTimeout / SECOND;
                  throw createCliError(
                    `[${name}] failed to match pattern within ${sec} seconds [pattern=${wait}]`
                  );
                })
              )
        ).toPromise();
      }

      if (wait === true) {
        // wait for process to complete
        await proc.outcomePromise;
      }
    } finally {
      // while the procRunner closes promises will resolve/reject because
      // processes and stopping, but consumers of run() shouldn't have to
      // prepare for that, so just return a never-resolving promise
      if (this.closing) {
        await new Promise(noop);
      }
    }
  }

  /**
   *  Stop a named proc
   */
  async stop(name: string, signal: NodeJS.Signals = 'SIGTERM') {
    const proc = this.getProc(name);
    if (proc) {
      await proc.stop(signal);
    } else {
      this.log.warning('[%s] already stopped', name);
    }
  }

  /**
   *  Wait for all running processes to stop naturally
   *  @return {Promise<undefined>}
   */
  async waitForAllToStop() {
    await Promise.all(this.procs.map((proc) => proc.outcomePromise));
  }

  /**
   *  Close the ProcRunner and stop all running
   *  processes with `signal`
   *
   *  @param  {String} [signal=undefined]
   *  @return {Promise}
   */
  async teardown(signal: NodeJS.Signals | 'exit' = 'exit') {
    if (this.closing) {
      return;
    }

    this.closing = true;
    this.signalUnsubscribe();

    if (!signal && this.procs.length > 0) {
      this.log.warning(
        '%d processes left running, stop them with procs.stop(name):',
        this.procs.length,
        this.procs.map((proc) => proc.name)
      );
    }

    await Promise.all(
      this.procs.map(async (proc) => {
        await proc.stop(signal === 'exit' ? 'SIGKILL' : signal);
      })
    );
  }

  private getProc(name: string) {
    return this.procs.find((proc) => {
      return proc.name === name;
    });
  }

  private startProc(name: string, options: ProcOptions) {
    const startMs = Date.now();
    const proc = startProc(name, options, this.log);

    this.procs.push(proc);
    const remove = () => {
      this.procs.splice(this.procs.indexOf(proc), 1);
    };

    // tie into proc outcome$, remove from _procs on compete
    proc.outcome$.subscribe({
      next: (code) => {
        const duration = moment.duration(Date.now() - startMs);
        this.log.info('[%s] exited with %s after %s', name, code, duration.humanize());
      },
      complete: () => {
        remove();
      },
      error: (error) => {
        if (this.closing) {
          this.log.error(error);
        }
        remove();
      },
    });

    return proc;
  }
}
