var util = require('util');
var EventEmitter = require('events').EventEmitter;

util.inherits(Status, EventEmitter);
function Status(name, server) {
  Status.super_.call(this);

  this.name = name;
  this.state = 'uninitialized';
  this.message = 'uninitialized';

  this.on('change', function (current, previous) {
    server.log(['plugins', name, 'info'], {
      tmpl: 'Change status from <%= prev %> to <%= cur %> - <%= curMsg %>',
      name: name,
      prev: previous.state,
      cur: current.state,
      curMsg: current.message
    });
  });
}

Status.prototype.green = makeStatusUpdateFn('green');
Status.prototype.yellow = makeStatusUpdateFn('yellow');
Status.prototype.red = makeStatusUpdateFn('red');
function makeStatusUpdateFn(color) {
  return function (message) {
    var previous = {
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

Status.prototype.toJSON = function () {
  return { state: this.state, message: this.message };
};

module.exports = Status;
