/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage, RequestId } from '@modelcontextprotocol/sdk/types.js';
import {
  isJSONRPCErrorResponse,
  isJSONRPCRequest,
  isJSONRPCResultResponse,
} from '@modelcontextprotocol/sdk/types.js';

export interface ExchangeTransport extends Transport {
  /** Delivers one HTTP request's messages, resolving with the reply to each JSON-RPC request. */
  exchange(messages: readonly JSONRPCMessage[]): Promise<JSONRPCMessage[]>;
}

/**
 * A transport that carries the messages of a single HTTP request to a server and collects its
 * replies, as a stateless Streamable HTTP server answers a POST with JSON.
 */
export const createExchangeTransport = (): ExchangeTransport => {
  const pending = new Map<RequestId, (reply: JSONRPCMessage) => void>();
  const transport: ExchangeTransport = {
    start: async () => {},
    close: async () => {
      transport.onclose?.();
    },
    send: async (message) => {
      const id =
        isJSONRPCResultResponse(message) || isJSONRPCErrorResponse(message)
          ? message.id
          : undefined;
      if (id !== undefined) {
        pending.get(id)?.(message);
        pending.delete(id);
      }
    },
    exchange: (messages) => {
      const replies = messages.filter(isJSONRPCRequest).map(
        ({ id }) =>
          new Promise<JSONRPCMessage>((resolve) => {
            pending.set(id, resolve);
          })
      );
      messages.forEach((message) => transport.onmessage?.(message));
      return Promise.all(replies);
    },
  };
  return transport;
};
