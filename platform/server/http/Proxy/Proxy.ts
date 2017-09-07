import { Server } from 'net';
import { IncomingMessage, OutgoingMessage } from 'http';
import { EventEmitter } from 'events';

import { Logger } from '../../../logging';

export class Proxy extends EventEmitter {
  private server: Server;
  private readonly eventHandlers: any;
  private port: number;

  constructor(private readonly log: Logger, readonly kbnServer: any) {
    super();

    const forwardEvent = (name: string, ...args: any[]) => {
      this.log.info(`Event is being forwarded: ${name}`);
      this.emit(name, ...args);
    };

    this.eventHandlers = {
      listening: forwardEvent.bind(this, 'listening'),
      error: forwardEvent.bind(this, 'error'),
      clientError: forwardEvent.bind(this, 'clientError'),
      connection: forwardEvent.bind(this, 'connection')
    };
  }

  address() {
    return this.server && this.server.address();
  }

  listen(port: number, host: string, callback: Function) {
    this.log.info(`"listen" has been called (${host}:${port}).`);
    this.port = port;

    this.emit('platform-start');
    callback && callback();
  }

  close(callback: Function) {
    this.log.info('"close" has been called.');

    this.emit('platform-stop');
    callback && callback();
  }

  getConnections(callback: (error?: Error, count?: number) => void) {
    // This method is used by `even-better` (before we start platform).
    // It seems that the latest version of parent `good` doesn't use this anymore.
    if (this.server) {
      this.server.getConnections(callback)
    } else {
      callback(undefined, 0);
    }
  }

  bind(server: Server) {
    if (this.server) {
      for (const [eventName, eventHandler] of Object.entries(
        this.eventHandlers
      )) {
        this.server.removeListener(eventName, eventHandler);
      }
    }

    this.server = server;
    for (const [eventName, eventHandler] of Object.entries(
      this.eventHandlers
    )) {
      this.server.addListener(eventName, eventHandler);
    }
  }

  proxy(request: IncomingMessage, response: OutgoingMessage) {
    this.log.info(
      `Request will be handled by proxy ${request.method}:${request.url}.`
    );
    this.emit('request', request, response);
  }

  getPort() {
    return this.port;
  }
}
