'use strict';

let _ = require('lodash');
let EventEmitter = require('events').EventEmitter;
let states = require('./states');

class Status extends EventEmitter {
  constructor(name, server) {
    super();

    this.name = name;
    this.since = new Date();
    this.state = 'uninitialized';
    this.message = 'uninitialized';

    this.on('change', function (previous, previousMsg) {
      this.since = new Date();
      server.log(['status', name, 'info'], {
        tmpl: 'Status changed from <%= prevState %> to <%= state %><% message && print(` - ${message}`) %>',
        name: name,
        state: this.state,
        message: this.message,
        prevState: previous,
        prevMsg: previousMsg
      });
    });
  }

  toJSON() {
    return {
      name: this.name,
      state: this.state,
      icon: states.get(this.state).icon,
      message: this.message,
      since: this.since
    };
  }
}

states.all.forEach(function (state) {
  Status.prototype[state.id] = function (message) {
    if (this.state === 'disabled') return;

    let previous = this.state;
    let previousMsg = this.message;

    this.state = state.id;
    this.message = message || state.title;

    if (previous === this.state && previousMsg === this.message) {
      // noop
      return;
    }

    this.emit(state.id, previous, previousMsg);
    this.emit('change', previous, previousMsg);
  };
});

module.exports = Status;
