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

module.exports = class Worker extends EventEmitter {
  constructor(opts) {
    opts = opts || {};
    super();

    this.log = opts.log;
    this.type = opts.type;
    this.title = opts.title || opts.type;
    this.filters = opts.filters;
    this.changes = [];

    let argv = _.union(baseArgv, opts.argv || []);
    this.env = {
      kbnWorkerType: this.type,
      kbnWorkerArgv: JSON.stringify(argv)
    };

    _.bindAll(this, ['onExit', 'onMessage', 'shutdown', 'start']);

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
    } else {
      // restart after graceful shutdowns
      this.start();
    }
  }

  onChange(path) {
    var valid = true;

    if (this.filters) {
      valid = _.any(this.filters, function (filter) {
        return filter.test(path);
      });
    }

    if (!valid) return;
    this.changes.push(path);
    this.start();
  }

  shutdown() {
    if (this.fork && !this.fork.isDead()) {
      this.fork.kill();
      this.fork.removeListener('message', this.onMessage);
    }
  }

  onMessage(msg) {
    if (!_.isArray(msg) || msg[0] !== 'WORKER_BROADCAST') return;
    this.emit('broadcast', msg[1]);
  }

  flushChangeBuffer() {
    let files = _.unique(this.changes.splice(0));
    let prefix = files.length > 1 ? '\n - ' : '';
    return files.reduce(function (list, file) {
      return `${list || ''}${prefix}"${file}"`;
    }, '');
  }

  start() {
    if (this.fork && !this.fork.isDead()) {
      // once "exit" event is received with 0 status, start() is called again
      return this.shutdown();
    }

    if (this.fork && this.changes.length) {
      this.log.warn(`${this.title} restarting`, `due to changes in ${this.flushChangeBuffer()}`);
    } else {
      this.log.warn(`${this.title} starting`);
    }

    this.fork = cluster.fork(this.env);
    this.fork.on('message', this.onMessage);
  }
};
