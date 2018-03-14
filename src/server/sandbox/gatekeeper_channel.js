import uuid from 'uuid';

export class GatekeeperChannel {
  _messageCallbacks = [];
  _messageAcks = {};

  constructor(gatekeeperProcess, processId) {
    this._gatekeeperProcess = gatekeeperProcess;
    this._processId = processId;

    this._gatekeeperProcess.on('message', ({ processId, ack, message }) => {
      if (this._processId !== processId) {
        return;
      }

      if (ack) {
        const messageAck = this._messageAcks[ack.id];
        if (ack.success) {
          messageAck.resolve();
        } else {
          messageAck.reject(ack.error);
        }
        return;
      }

      for (const cb of this._messageCallbacks) {
        cb(message);
      }
    });
  }

  async send(type, payload) {
    const messageId = uuid.v4();
    this._gatekeeperProcess.send({ processId: this._processId, message: { id: messageId, type, payload } });
    return new Promise((resolve, reject) => {
      this._messageAcks[messageId] = { resolve, reject };
    });
  }

  onMessage(cb) {
    this._messageCallbacks.push(cb);
  }
}