var util = require('util');
var EventEmitter = require('events').EventEmitter;

util.inherits(PluginStatus, EventEmitter);
function PluginStatus(name) {
  PluginStatus.super_.call(this);

  this.name = name;
  this.state = undefined;
  this.message = 'uninitialized';
}

PluginStatus.prototype.green = makeStatusUpdateFn('green');
PluginStatus.prototype.yellow = makeStatusUpdateFn('yellow');
PluginStatus.prototype.red = makeStatusUpdateFn('red');
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

PluginStatus.prototype.toJSON = function () {
  return { state: this.state, message: this.message };
};

module.exports = PluginStatus;
