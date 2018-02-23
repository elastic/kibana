import { Readable } from 'stream';

class SyntheticStream extends Readable {
  constructor(options) {
    super(options);
  }

  _read() {
  }
}

export class SyntheticProcess {

  _callbacks = {};

  stdout = new SyntheticStream();
  stderr = new SyntheticStream();

  constructor(channel, command, args) {
    this._channel = channel;
    this._channel.send('spawn', { command, args });

    this._channel.onMessage(({ type, payload }) => {
      switch (type) {
        case 'stdout': {
          this.stdout.push(payload);
          break;
        }
        case 'stderr': {
          this.stderr.push(payload);
          break;
        }
        default: {
          const callbacks = this._callbacks[type];
          callbacks.forEach(callback => callback(payload));
        }
      }
    });
  }

  addListener(event, callback) {
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }

    this._callbacks[event].push(callback);
  }

  removeListener(event, callback) {
    const index = this._callbacks[event].indexOf(callback);
    if (index === -1) {
      throw new Error(`Listener not found, can't be removed.`);
    }

    this._callbacks[event].splice(index, 1);
  }

  kill(signal) {
    this._channel.send('kill', signal);
  }
}