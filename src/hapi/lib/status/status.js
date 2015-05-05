var util = require('util');
var EventEmitter = require('events').EventEmitter;

util.inherits(Status, EventEmitter);
function Status(name) {
  this.name = name;
  this.state = 'red';
  this.message = '';
  EventEmitter.call(this);
  var self = this;
}

function createStatusFn(color) {
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

Status.prototype.green = createStatusFn('green');
Status.prototype.yellow = createStatusFn('yellow');
Status.prototype.red = createStatusFn('red');

Status.prototype.toJSON = function () {
  return { state: this.state, message: this.message };
};

module.exports = Status;
