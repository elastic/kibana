'use strict';

let _ = require('lodash');
let cluster = require('cluster');
let resolve = require('path').resolve;
let EventEmitter = require('events').EventEmitter;

let log = require('../../cli/log');
let fromRoot = require('../../utils/fromRoot');

let cliPath = fromRoot('src/cli/cli.js');
let baseArgs = _.difference(process.argv.slice(2), ['--no-watch']);
let baseArgv = [process.execPath, cliPath].concat(baseArgs);

cluster.setupMaster({
  exec: cliPath,
  silent: false
});

module.exports = class Worker extends EventEmitter {
  constructor(gaze, opts) {
    opts = opts || {};
    super();

    this.type = opts.type;
    this.title = opts.title || opts.type;
    this.filter = opts.filter || _.constant(true);
    this.changeBuffer = [];

    this.env = {
      kbnWorkerType: this.type,
      kbnWorkerArgv: JSON.stringify(baseArgv.concat(opts.args || []))
    };

    _.bindAll(this, ['onExit', 'onMessage', 'start']);

    this.start = _.debounce(this.start, 25);
    cluster.on('exit', this.onExit);
  }

  onExit(fork, code) {
    if (this.fork !== fork) return;
    if (code) log.red(`${this.title} crashed`, 'with status code', code);
    else this.start(); // graceful shutdowns happen on restart
  }

  onChange(path) {
    if (!this.filter(path)) return;
    this.changeBuffer.push(path);
    this.start();
  }

  onMessage(msg) {
    if (!_.isArray(msg) || msg[0] !== 'WORKER_BROADCAST') return;
    this.emit('broadcast', msg[1]);
  }

  flushChangeBuffer() {
    let files = _.unique(this.changeBuffer.splice(0));
    let prefix = files.length > 1 ? '\n - ' : '';
    return files.reduce(function (list, file, i, files) {
      return `${list || ''}${prefix}"${file}"`;
    }, '');
  }

  start() {
    if (this.fork) {
      if (!this.fork.isDead()) {
        this.fork.kill();
        this.fork.removeListener('message', this.onMessage);
        // once "exit" event is received with 0 status, start() is called again
        return;
      }

      if (this.changeBuffer.length) {
        log.yellow(`${this.title} restarting`, `due to changes in ${this.flushChangeBuffer()}`);
      }
    }
    else {
      log.yellow(`${this.title} starting`);
    }

    this.fork = cluster.fork(this.env);
    this.fork.on('message', this.onMessage);
  }
};
