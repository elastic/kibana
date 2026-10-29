/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MessagePort } from 'node:worker_threads';
import { newMessagePortRpcSession, RpcSession, type RpcStub } from 'capnweb';

/**
 * JSON-string MessagePort transport, used only under Jest.
 *
 * Cap'n Web's structured-clone transport checks `instanceof Array`. That fails when a message
 * is delivered into a Jest VM realm. Strings are parsed in the session's own realm.
 * Production sessions use `newMessagePortRpcSession`, which posts the value directly.
 */
class StringMessagePortTransport {
  readonly encodingLevel = 'string' as const;
  #port: MessagePort;
  #queue: string[] = [];
  #waiter: ((value: string) => void) | undefined;
  #failer: ((error: unknown) => void) | undefined;
  #error: unknown;

  constructor(port: MessagePort) {
    this.#port = port;
    port.start();
    port.addEventListener('message', (event: Event) => {
      const data = (event as MessageEvent).data;
      if (this.#error) return;
      if (data === null) {
        this.#fail(new Error('Peer closed MessagePort connection.'));
        return;
      }
      if (typeof data !== 'string') {
        this.#fail(new Error('Remote session expected a JSON string message.'));
        return;
      }
      if (this.#waiter) {
        const resolve = this.#waiter;
        this.#waiter = undefined;
        this.#failer = undefined;
        resolve(data);
      } else {
        this.#queue.push(data);
      }
    });
    port.addEventListener('messageerror', () => {
      this.#fail(new Error('MessagePort message error.'));
    });
  }

  send(message: string): void {
    if (this.#error) throw this.#error;
    this.#port.postMessage(message);
  }

  receive(): Promise<string> {
    const queued = this.#queue.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    if (this.#error) return Promise.reject(this.#error);
    return new Promise((resolve, reject) => {
      this.#waiter = resolve;
      this.#failer = reject;
    });
  }

  abort(reason: unknown): void {
    try {
      this.#port.postMessage(null);
    } catch {
      // The port may already be closed.
    }
    this.#port.close();
    this.#fail(reason);
  }

  #fail(error: unknown): void {
    if (this.#error) return;
    this.#error = error;
    this.#failer?.(error);
    this.#waiter = undefined;
    this.#failer = undefined;
  }
}

type CapnWebMessagePort = Parameters<typeof newMessagePortRpcSession>[0];

/** Opens a Cap'n Web session on one end of a MessageChannel. */
export function openPortSession<T>(port: MessagePort, localMain?: object): RpcStub<T> {
  if (process.env.JEST_WORKER_ID) {
    return new RpcSession<T>(new StringMessagePortTransport(port), localMain).getRemoteMain();
  }
  // Cap'n Web types this as the DOM MessagePort. Node's worker MessagePort is the runtime value.
  return newMessagePortRpcSession<T>(port as unknown as CapnWebMessagePort, localMain);
}
