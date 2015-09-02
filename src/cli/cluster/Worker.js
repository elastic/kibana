let _ = require('lodash');
let cluster = require('cluster');
let { resolve } = require('path');
let { EventEmitter } = require('events');

let fromRoot = require('../../utils/fromRoot');

let cliPath = fromRoot('src/cli');
let baseArgs = _.difference(process.argv.slice(2), ['--no-watch']);
let baseArgv = [process.execPath, cliPath].concat(baseArgs);

cluster.setupMaster({
  exec: cliPath,
  silent: false
});

let dead = fork => {
  return fork.isDead() || fork.killed;
};

let kill = fork => {
  // fork.kill() waits for process to disconnect, but causes occasional
  // "ipc disconnected" errors and is too slow for the proc's "exit" event
  fork.process.kill();
  fork.killed = true;
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
    this.online = false;
    this.changes = [];

    let argv = _.union(baseArgv, opts.argv || []);
    this.env = {
      kbnWorkerType: this.type,
      kbnWorkerArgv: JSON.stringify(argv)
    };

    _.bindAll(this, ['onExit', 'onMessage', 'onOnline', 'onDisconnect', 'shutdown', 'start']);

    this.start = _.debounce(this.start, 25);
    cluster.on('exit', this.onExit);
    process.on('exit', this.shutdown);
  }

  onExit(fork, code) {
    if (this.fork !== fork) return;

    // our fork is gone, clear our ref so we don't try to talk to it anymore
    this.fork = null;

    if (code) {
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

  shutdown() {
    if (this.fork && !dead(this.fork)) {
      kill(this.fork);
      this.fork.removeListener('message', this.onMessage);
      this.fork.removeListener('online', this.onOnline);
      this.fork.removeListener('disconnect', this.onDisconnect);
    }
  }

  onMessage(msg) {
    if (!_.isArray(msg) || msg[0] !== 'WORKER_BROADCAST') return;
    this.emit('broadcast', msg[1]);
  }

  onOnline() {
    this.online = true;
  }

  onDisconnect() {
    this.online = false;
  }

  flushChangeBuffer() {
    let files = _.unique(this.changes.splice(0));
    let prefix = files.length > 1 ? '\n - ' : '';
    return files.reduce(function (list, file) {
      return `${list || ''}${prefix}"${file}"`;
    }, '');
  }

  start() {
    // once "exit" event is received with 0 status, start() is called again
    if (this.fork) return this.shutdown();

    if (this.changes.length) {
      this.log.warn(`restarting ${this.title}`, `due to changes in ${this.flushChangeBuffer()}`);
    }
    else if (this.startCount++) {
      this.log.warn(`restarting ${this.title}...`);
    }

    this.fork = cluster.fork(this.env);
    this.fork.on('message', this.onMessage);
    this.fork.on('online', this.onOnline);
    this.fork.on('disconnect', this.onDisconnect);
  }
};
