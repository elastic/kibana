'use strict';

let _ = require('lodash');
let EventEmitter = require('events').EventEmitter;

class Status extends EventEmitter {
  constructor(name, server) {
    super();

    this.name = name;
    this.since = new Date();
    this.state = 'uninitialized';
    this.message = 'uninitialized';

    this.on('change', function (current, previous) {
      this.since = new Date();
      server.log(['status', name, 'info'], {
        tmpl: 'Status changed from <%= prev %> to <%= cur %><% curMsg && print(` - ${curMsg}`) %>',
        name: name,
        prev: previous.state,
        cur: current.state,
        curMsg: current.message
      });
    });
  }

  toJSON() {
    return {
      name: this.name,
      state: this.state,
      message: this.message,
      since: this.since
    };
  }
}

Status.prototype.green = makeStatusUpdateFn('green');
Status.prototype.yellow = makeStatusUpdateFn('yellow');
Status.prototype.red = makeStatusUpdateFn('red');
Status.prototype.disabled = _.wrap(makeStatusUpdateFn('disabled'), function (update, msg) {
  let ret = update.call(this, msg);

  this.green =
  this.yellow =
  this.red = _.noop;

  return ret;
});

function makeStatusUpdateFn(color) {
  return function (message) {
    let previous = {
      state: this.state,
      message: this.message
    };
    this.state = color;
    this.message = message;
    if (previous.state === this.state && previous.message === this.message) return;
    this.emit(color, message, previous);
    this.emit('change', this.toJSON(), previous);
  };
}

module.exports = Status;
