import _ from 'lodash';
import cluster from 'cluster';
import { EventEmitter } from 'events';

import { BinderFor, fromRoot } from '../../utils';

const cliPath = fromRoot('src/cli');
const baseArgs = _.difference(process.argv.slice(2), ['--no-watch']);
const baseArgv = [process.execPath, cliPath].concat(baseArgs);

cluster.setupMaster({
  exec: cliPath,
  silent: false
});

const dead = fork => {
  return fork.isDead() || fork.killed;
};

module.exports = class Worker extends EventEmitter {
  constructor(opts) {
    opts = opts || {};
    super();

    this.log = opts.log;
    this.type = opts.type;
    this.title = opts.title || opts.type;
    this.watch = (opts.watch !== false);
    this.startCount = 0;

    // status flags
    this.online = false; // the fork can accept messages
    this.listening = false; // the fork is listening for connections
    this.crashed = false; // the fork crashed

    this.changes = [];

    this.forkBinder = null; // defined when the fork is
    this.clusterBinder = new BinderFor(cluster);
    this.processBinder = new BinderFor(process);

    const argv = _.union(baseArgv, opts.argv || []);
    this.env = {
      kbnWorkerType: this.type,
      kbnWorkerArgv: JSON.stringify(argv)
    };
  }

  onExit(fork, code) {
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

  onChange(path) {
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
      this.forkBinder.destroy();

      // we don't need to react to process.exit anymore
      this.processBinder.destroy();

      // wait until the cluster reports this fork has exited, then resolve
      await new Promise(resolve => this.once('fork:exit', resolve));
    }
  }

  parseIncomingMessage(msg) {
    if (!_.isArray(msg)) return;
    this.onMessage(...msg);
  }

  onMessage(type, data) {
    switch (type) {
      case 'WORKER_BROADCAST':
        this.emit('broadcast', data);
        break;
      case 'WORKER_LISTENING':
        this.listening = true;
        this.emit('listening');
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
    const files = _.unique(this.changes.splice(0));
    const prefix = files.length > 1 ? '\n - ' : '';
    return files.reduce(function (list, file) {
      return `${list || ''}${prefix}"${file}"`;
    }, '');
  }

  async start() {
    if (this.fork) {
      // once "exit" event is received with 0 status, start() is called again
      this.shutdown();
      await new Promise(cb => this.once('online', cb));
      return;
    }

    if (this.changes.length) {
      this.log.warn(`restarting ${this.title}`, `due to changes in ${this.flushChangeBuffer()}`);
    }
    else if (this.startCount++) {
      this.log.warn(`restarting ${this.title}...`);
    }

    this.fork = cluster.fork(this.env);
    this.forkBinder = new BinderFor(this.fork);

    // when the fork sends a message, comes online, or looses it's connection, then react
    this.forkBinder.on('message', msg => this.parseIncomingMessage(msg));
    this.forkBinder.on('online', () => this.onOnline());
    this.forkBinder.on('disconnect', () => this.onDisconnect());

    // when the cluster says a fork has exited, check if it is ours
    this.clusterBinder.on('exit', (fork, code) => this.onExit(fork, code));

    // when the process exits, make sure we kill our workers
    this.processBinder.on('exit', () => this.shutdown());

    // wait for the fork to report it is online before resolving
    await new Promise(cb => this.once('fork:online', cb));
  }
};
