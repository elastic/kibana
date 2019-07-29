"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ProcRunner = void 0;

var _moment = _interopRequireDefault(require("moment"));

var _operators = require("rxjs/operators");

var _errors = require("./errors");

var _proc = require("./proc");

var _observe_signals = require("./observe_signals");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const noop = () => {};
/**
 *  Helper for starting and managing processes. In many ways it resembles the
 *  API from `grunt_run`, processes are named and can be started, waited for,
 *  backgrounded once they log something matching a RegExp...
 *
 *  @class ProcRunner
 */


class ProcRunner {
  constructor(options) {
    const {
      log
    } = options;
    this._closing = false;
    this._procs = [];
    this._log = log;
    this._signalSubscription = (0, _observe_signals.observeSignals)(process).subscribe({
      next: async signal => {
        await this.teardown(signal);

        if (signal !== 'exit') {
          // resend the signal
          process.kill(process.pid, signal);
        }
      }
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


  async run(name, options) {
    const {
      cmd,
      args = [],
      cwd = process.cwd(),
      stdin = null,
      wait = false,
      env = process.env
    } = options;

    if (this._closing) {
      throw new Error('ProcRunner is closing');
    }

    if (wait && !(wait instanceof RegExp) && wait !== true) {
      throw new TypeError('wait param should either be a RegExp or `true`');
    }

    if (!!this._getProc(name)) {
      throw new Error(`Process with name "${name}" already running`);
    }

    const proc = this._createProc(name, {
      cmd,
      args,
      cwd,
      env,
      stdin
    });

    try {
      // wait for process to log matching line
      if (wait instanceof RegExp) {
        await proc.lines$.pipe((0, _operators.filter)(line => wait.test(line)), (0, _operators.first)(), (0, _operators.catchError)(err => {
          if (err.name !== 'EmptyError') {
            throw (0, _errors.createCliError)(`[${name}] exited without matching pattern: ${wait}`);
          } else {
            throw err;
          }
        })).toPromise();
      } // wait for process to complete


      if (wait === true) {
        await proc.getOutcomePromise();
      }
    } finally {
      // while the procRunner closes promises will resolve/reject because
      // processes and stopping, but consumers of run() shouldn't have to
      // prepare for that, so just return a never-resolving promise
      if (this._closing) {
        await new Promise(noop);
      }
    }
  }
  /**
   *  Stop a named proc
   *  @param  {String}  name
   *  @param  {String}  [signal='SIGTERM']
   *  @return {Promise<undefined>}
   */


  async stop(name, signal = 'SIGTERM') {
    const proc = this._getProc(name);

    if (proc) {
      await proc.stop(signal);
    } else {
      this._log.warning('[%s] already stopped', name);
    }
  }
  /**
   *  Wait for all running processes to stop naturally
   *  @return {Promise<undefined>}
   */


  async waitForAllToStop() {
    await Promise.all(this._procs.map(proc => proc.getOutcomePromise()));
  }
  /**
   *  Close the ProcRunner and stop all running
   *  processes with `signal`
   *
   *  @param  {String} [signal=undefined]
   *  @return {Promise}
   */


  async teardown(signal) {
    if (this._closing) return;
    this._closing = true;

    this._signalSubscription.unsubscribe();

    this._signalSubscription = null;

    if (!signal && this._procs.length > 0) {
      this._log.warning('%d processes left running, stop them with procs.stop(name):', this._procs.length, this._procs.map(proc => proc.name));
    }

    const stopWith = signal === 'exit' ? 'SIGKILL' : signal;
    await Promise.all(this._procs.map(proc => proc.stop(stopWith)));
  }

  _getProc(name) {
    return this._procs.find(proc => proc.name === name);
  }

  _createProc(name, options) {
    const startMs = Date.now();
    const proc = (0, _proc.createProc)(name, { ...options,
      log: this._log
    });

    this._procs.push(proc);

    const remove = () => {
      this._procs.splice(this._procs.indexOf(proc), 1);
    }; // tie into proc outcome$, remove from _procs on compete


    proc.outcome$.subscribe({
      next: code => {
        const duration = _moment.default.duration(Date.now() - startMs);

        this._log.info('[%s] exited with %s after %s', name, code, duration.humanize());
      },
      complete: () => {
        remove();
      },
      error: error => {
        if (this._closing) {
          this._log.error(error);
        }

        remove();
      }
    });
    return proc;
  }

}

exports.ProcRunner = ProcRunner;