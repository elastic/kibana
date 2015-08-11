
let { fromNode } = require('bluebird');

module.exports = class WeirdControlFlow {
  constructor(work) {
    this.handlers = [];
  }

  get() {
    return fromNode(cb => {
      if (this.ready) return cb();
      this.handlers.push(cb);
      this.start();
    });
  }

  work(work) {
    this._work = work;
    this.stop();

    if (this.handlers.length) {
      this.start();
    }
  }

  start() {
    if (this.running) return;
    this.stop();
    if (this._work) {
      this.running = true;
      this._work();
    }
  }

  stop() {
    this.ready = false;
    this.error = false;
    this.running = false;
  }

  success(...args) {
    this.stop();
    this.ready = true;
    this._flush(args);
  }

  failure(err) {
    this.stop();
    this.error = err;
    this._flush([err]);
  }

  _flush(args) {
    for (let fn of this.handlers.splice(0)) {
      fn.apply(null, args);
    }
  }
};
