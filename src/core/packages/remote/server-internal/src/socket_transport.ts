/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Socket } from 'node:net';

export interface Traffic {
  sentBytes: number;
  receivedBytes: number;
  sentMessages: number;
  receivedMessages: number;
}

/** Counts encoded UTF-8 Cap'n Web strings plus newline framing at one endpoint only. */
export class SocketTransport {
  readonly encodingLevel = 'string' as const;
  readonly traffic: Traffic = { sentBytes: 0, receivedBytes: 0, sentMessages: 0, receivedMessages: 0 };
  private buffer = '';
  private readonly queue: string[] = [];
  private waiter?: { resolve(value: string): void; reject(error: Error): void };
  private failure?: Error;


  constructor(private readonly socket: Socket, private readonly outboundDelayMs = 0) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      this.traffic.receivedBytes += Buffer.byteLength(chunk);
      this.buffer += chunk;
      for (let index = this.buffer.indexOf('\n'); index !== -1; index = this.buffer.indexOf('\n')) {
        const message = this.buffer.slice(0, index);
        this.buffer = this.buffer.slice(index + 1);
        this.traffic.receivedMessages++;
        if (this.waiter) {
          this.waiter.resolve(message);
          this.waiter = undefined;
        } else {
          this.queue.push(message);
        }
      }
    });
    socket.on('error', (error) => this.fail(error));
    socket.on('close', () => this.fail(new Error('Invocation RPC connection closed; calls are not replayed')));
  }

  send(message: string): void {
    const write = (): void => {
      if (this.failure) return;
      const frame = `${message}\n`;
      this.traffic.sentBytes += Buffer.byteLength(frame);
      this.traffic.sentMessages++;
      this.socket.write(frame);
    };
    if (this.outboundDelayMs) setTimeout(write, this.outboundDelayMs);
    else write();
  }

  receive(): Promise<string> {
    const next = this.queue.shift();
    if (next !== undefined) return Promise.resolve(next);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => { this.waiter = { resolve, reject }; });
  }

  abort(): void { this.socket.destroy(); }

  private fail(error: Error): void {
    this.failure = error;
    this.waiter?.reject(error);
    this.waiter = undefined;
  }
}
