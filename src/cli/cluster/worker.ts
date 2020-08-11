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

import _ from 'lodash';
import cluster from 'cluster';
import { EventEmitter } from 'events';

import { BinderFor } from '../../legacy/utils/binder_for';
import { fromRoot } from '../../core/server/utils';

const cliPath = fromRoot('src/cli');
const baseArgs = _.difference(process.argv.slice(2), ['--no-watch']);
const baseArgv = [process.execPath, cliPath].concat(baseArgs);

export type ClusterWorker = cluster.Worker & {
  killed: boolean;
  exitCode?: number;
};

cluster.setupMaster({
  exec: cliPath,
  silent: false,
});

const dead = (fork: ClusterWorker) => {
  return fork.isDead() || fork.killed;
};

interface WorkerOptions {
  type: string;
  log: any; // src/cli/log.js
  argv?: string[];
  title?: string;
  watch?: boolean;
  baseArgv?: string[];
}

export class Worker extends EventEmitter {
  private readonly clusterBinder: BinderFor;
  private readonly processBinder: BinderFor;

  private type: string;
  private title: string;
  private log: any;
  private forkBinder: BinderFor | null = null;
  private startCount: number;
  private watch: boolean;
  private env: Record<string, string>;

  public fork: ClusterWorker | null = null;
  public changes: string[];

  // status flags
  public online = false; // the fork can accept messages
  public listening = false; // the fork is listening for connections
  public crashed = false; // the fork crashed

  constructor(opts: WorkerOptions) {
    super();

    this.log = opts.log;
    this.type = opts.type;
    this.title = opts.title || opts.type;
    this.watch = opts.watch !== false;
    this.startCount = 0;

    this.changes = [];

    this.clusterBinder = new BinderFor(cluster as any); // lack the 'off' method
    this.processBinder = new BinderFor(process);

    this.env = {
      NODE_OPTIONS: process.env.NODE_OPTIONS || '',
      kbnWorkerType: this.type,
      kbnWorkerArgv: JSON.stringify([...(opts.baseArgv || baseArgv), ...(opts.argv || [])]),
    };
  }

  onExit(fork: ClusterWorker, code: number) {
    if (this.fork !== fork) return;

    // we have our fork's exit, so stop listening for others
    this.clusterBinder.destroy();

    // our fork is gone, clear our ref so we don't try to talk to it anymore
    this.fork = null;
    this.forkBinder = null;

    this.online = false;
    this.listening = false;
    this.emit('fork:exit');
    this.crashed = code > 0;

    if (this.crashed) {
      this.emit('crashed');
      this.log.bad(`${this.title} crashed`, 'with status code', code);
      if (!this.watch) process.exit(code);
    } else {
      // restart after graceful shutdowns
      this.start();
    }
  }

  onChange(path: string) {
    if (!this.watch) return;
    this.changes.push(path);
    this.start();
  }

  async shutdown() {
    if (this.fork && !dead(this.fork)) {
      // kill the fork
      this.fork.process.kill();
      this.fork.killed = true;

      // stop listening to the fork, it's just going to die
      this.forkBinder!.destroy();

      // we don't need to react to process.exit anymore
      this.processBinder.destroy();

      // wait until the cluster reports this fork has exited, then resolve
      await new Promise((resolve) => this.once('fork:exit', resolve));
    }
  }

  parseIncomingMessage(msg: any) {
    if (!Array.isArray(msg)) {
      return;
    }
    this.onMessage(msg[0], msg[1]);
  }

  onMessage(type: string, data?: any) {
    switch (type) {
      case 'WORKER_BROADCAST':
        this.emit('broadcast', data);
        break;
      case 'OPTIMIZE_STATUS':
        this.emit('optimizeStatus', data);
        break;
      case 'WORKER_LISTENING':
        this.listening = true;
        this.emit('listening');
        break;
      case 'RELOAD_LOGGING_CONFIG_FROM_SERVER_WORKER':
        this.emit('reloadLoggingConfigFromServerWorker');
        break;
    }
  }

  onOnline() {
    this.online = true;
    this.emit('fork:online');
    this.crashed = false;
  }

  onDisconnect() {
    this.online = false;
    this.listening = false;
  }

  flushChangeBuffer() {
    const files = _.uniq(this.changes.splice(0));
    const prefix = files.length > 1 ? '\n - ' : '';
    return files.reduce(function (list, file) {
      return `${list || ''}${prefix}"${file}"`;
    }, '');
  }

  async start() {
    if (this.fork) {
      // once "exit" event is received with 0 status, start() is called again
      this.shutdown();
      await new Promise((cb) => this.once('online', cb));
      return;
    }

    if (this.changes.length) {
      this.log.warn(`restarting ${this.title}`, `due to changes in ${this.flushChangeBuffer()}`);
    } else if (this.startCount++) {
      this.log.warn(`restarting ${this.title}...`);
    }

    this.fork = cluster.fork(this.env) as ClusterWorker;
    this.emit('starting');
    this.forkBinder = new BinderFor(this.fork);

    // when the fork sends a message, comes online, or loses its connection, then react
    this.forkBinder.on('message', (msg: any) => this.parseIncomingMessage(msg));
    this.forkBinder.on('online', () => this.onOnline());
    this.forkBinder.on('disconnect', () => this.onDisconnect());

    // when the cluster says a fork has exited, check if it is ours
    this.clusterBinder.on('exit', (fork: ClusterWorker, code: number) => this.onExit(fork, code));

    // when the process exits, make sure we kill our workers
    this.processBinder.on('exit', () => this.shutdown());

    // wait for the fork to report it is online before resolving
    await new Promise((cb) => this.once('fork:online', cb));
  }
}
