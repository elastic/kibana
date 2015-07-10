'use strict';

let _ = require('lodash');
let cluster = require('cluster');
let join = require('path').join;

let log = require('./log');

let cliPath = join(__dirname, '..', 'cli.js');
let baseArgs = _.difference(process.argv.slice(2), ['--no-watch']);
let baseArgv = [process.execPath, cliPath].concat(baseArgs);

cluster.setupMaster({
  exec: cliPath,
  silent: false
});

module.exports = class Worker {
  constructor(gaze, opts) {
    var self = this;
    opts = opts || {};

    self.type = opts.type;
    self.title = opts.title || opts.type;
    self.filter = opts.filter || _.constant(true);
    self.changeBuffer = [];

    self.env = {
      kbnWorkerType: self.type,
      kbnWorkerArgv: JSON.stringify(baseArgv.concat(opts.args || []))
    };

    self.start = _.debounce(_.bind(self.start, self), 25);
    cluster.on('exit', function (fork, code) {
      if (self.fork !== fork) return;
      self.onExit(code);
    });
  }

  onExit(code) {
    if (code) log.red(`${this.title} crashed`, 'with status code', code);
    else this.start(); // graceful shutdowns happen on restart
  }

  onChange(path) {
    if (!this.filter(path)) return;
    this.changeBuffer.push(path);
    this.start();
  }

  onOnline() {
    log.green(`${this.title} started`);
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
    this.fork.once('online', _.bindKey(this, 'onOnline'));
  }
};
