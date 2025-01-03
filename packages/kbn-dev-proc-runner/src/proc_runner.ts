/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import exitHook from 'exit-hook';
import { ToolingLog } from '@kbn/tooling-log';
import { createFailError } from '@kbn/dev-cli-errors';

import { Proc, ProcOptions, startProc } from './proc';

const SECOND = 1000;
const MINUTE = 60 * SECOND;

const noop = () => {};

interface RunOptions extends ProcOptions {
  wait: true | RegExp;
  waitTimeout?: number | false;
  onEarlyExit?: (msg: string) => void;
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

  constructor(private readonly log: ToolingLog) {
    this.log = log.withType('ProcRunner');

    this.signalUnsubscribe = exitHook(() => {
      this.teardown().catch((error) => {
        this.log.error(`ProcRunner teardown error: ${error.stack}`);
      });
    });
  }

  /**
   *  Start a process, tracking it by `name`
   */
  async run(name: string, options: RunOptions) {
    const {
      args = [],
      cwd = process.cwd(),
      stdin = undefined,
      wait = false,
      waitTimeout = 15 * MINUTE,
      env = process.env,
      onEarlyExit,
      writeLogsToPath,
    } = options;
    const cmd = options.cmd === 'node' ? process.execPath : options.cmd;

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
      writeLogsToPath,
    });

    if (onEarlyExit) {
      proc.outcomePromise
        .then(
          (code) => {
            if (!proc.stopWasCalled()) {
              onEarlyExit(`[${name}] exitted early with ${code}`);
            }
          },
          (error) => {
            if (!proc.stopWasCalled()) {
              onEarlyExit(`[${name}] exitted early: ${error.message}`);
            }
          }
        )
        .catch((error) => {
          throw new Error(`Error handling early exit: ${error.stack}`);
        });
    }

    try {
      if (wait instanceof RegExp) {
        // wait for process to log matching line
        await Rx.lastValueFrom(
          Rx.race(
            proc.lines$.pipe(
              Rx.filter((line) => wait.test(line)),
              Rx.take(1),
              Rx.defaultIfEmpty(undefined),
              Rx.map((line) => {
                if (line === undefined) {
                  throw createFailError(`[${name}] exited without matching pattern: ${wait}`);
                }
              })
            ),
            waitTimeout === false
              ? Rx.NEVER
              : Rx.timer(waitTimeout).pipe(
                  Rx.map(() => {
                    const sec = waitTimeout / SECOND;
                    throw createFailError(
                      `[${name}] failed to match pattern within ${sec} seconds [pattern=${wait}]`
                    );
                  })
                )
          )
        );
      }

      if (wait === true) {
        // wait for process to complete
        await proc.outcomePromise;
      }
    } catch (e) {
      this.log.error(e);
      throw e;
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
        this.log.info(
          '[%s] exited with %s after %s seconds',
          name,
          code,
          ((Date.now() - startMs) / 1000).toFixed(1)
        );
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
