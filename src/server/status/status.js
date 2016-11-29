import _ from 'lodash';
import states from './states';
import { EventEmitter } from 'events';

class Status extends EventEmitter {
  constructor(id, server) {
    super();

    if (!id || typeof id !== 'string') {
      throw new TypeError('Status constructor requires an `id` string');
    }

    this.id = id;
    this.since = new Date();
    this.state = 'uninitialized';
    this.message = 'uninitialized';

    this.on('change', function (previous, previousMsg) {
      this.since = new Date();

      const tags = [
        'status',
        this.id,
        this.state === 'red' ? 'error' : 'info'
      ];

      server.log(tags, {
        tmpl: 'Status changed from <%= prevState %> to <%= state %><%= message ? " - " + message : "" %>',
        state: this.state,
        message: this.message,
        prevState: previous,
        prevMsg: previousMsg
      });
    });
  }

  toJSON() {
    return {
      id: this.id,
      state: this.state,
      icon: states.get(this.state).icon,
      message: this.message,
      since: this.since
    };
  }

  on(eventName, handler) {
    super.on(eventName, handler);

    if (eventName === this.state) {
      setImmediate(() => handler(this.state, this.message));
    }
  }

  once(eventName, handler) {
    if (eventName === this.state) {
      setImmediate(() => handler(this.state, this.message));
    } else {
      super.once(eventName, handler);
    }
  }
}

states.all.forEach(function (state) {
  Status.prototype[state.id] = function (message) {
    if (this.state === 'disabled') return;

    let previous = this.state;
    let previousMsg = this.message;

    this.error = null;
    this.message = message || state.title;
    this.state = state.id;

    if (message instanceof Error) {
      this.error = message;
      this.message = message.message;
    }

    if (previous === this.state && previousMsg === this.message) {
      // noop
      return;
    }

    this.emit(state.id, previous, previousMsg, this.state, this.message);
    this.emit('change', previous, previousMsg, this.state, this.message);
  };
});

module.exports = Status;
