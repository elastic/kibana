export class GatekeeperChannel {
  _messageCallbacks = [];

  constructor(gatekeeperProcess, id) {
    this._gatekeeperProcess = gatekeeperProcess;
    this._id = id;

    this._gatekeeperProcess.on('message', ({ id, message }) => {
      if (this._id !== id) {
        return;
      }

      for (const cb of this._messageCallbacks) {
        cb(message);
      }
    });
  }

  send(type, payload) {
    this._gatekeeperProcess.send({ id: this._id, message: { type, payload } });
  }

  onMessage(cb) {
    this._messageCallbacks.push(cb);
  }
}