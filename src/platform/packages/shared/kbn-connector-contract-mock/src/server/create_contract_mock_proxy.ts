/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'http';
import { createServer } from 'http';
import type { AddressInfo, Socket } from 'net';
import type { Duplex } from 'stream';
import type { SecureContext } from 'tls';
import { createSecureContext, TLSSocket } from 'tls';
import type { CertificateAuthority } from './certificate_authority';

export interface ContractMockProxyOptions {
  /** Answers every request the proxy receives, typically a contract mock's `fetch`. */
  readonly fetch: typeof fetch;
  /** Issues the certificates presented for HTTPS hosts; clients must trust its certificate. */
  readonly certificateAuthority: CertificateAuthority;
}

export interface ContractMockProxy {
  /** Starts listening, by default on a free port of 127.0.0.1, and resolves to the proxy URL. */
  readonly listen: (port?: number, host?: string) => Promise<URL>;
  readonly close: () => Promise<void>;
}

// RFC 9110 §7.6.1, plus the de facto Proxy-Connection.
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);
const JSON_HEADERS = { 'content-type': 'application/json' };

const readBody = async (request: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const toFetchRequest = (target: URL, request: IncomingMessage, body: Buffer): Request => {
  const headers = new Headers();
  const { rawHeaders } = request;
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index].toLowerCase();
    if (name !== 'host' && !HOP_BY_HOP_HEADERS.has(name)) {
      headers.append(name, rawHeaders[index + 1]);
    }
  }
  const method = request.method ?? 'GET';
  const hasBody = body.length > 0 && method !== 'GET' && method !== 'HEAD';
  return new Request(target, { method, headers, body: hasBody ? new Uint8Array(body) : undefined });
};

const sendResponse = async (
  response: ServerResponse,
  fetchResponse: Response,
  method: string | undefined
): Promise<void> => {
  const body = Buffer.from(await fetchResponse.arrayBuffer());
  const headers: OutgoingHttpHeaders = {};
  fetchResponse.headers.forEach((value, name) => {
    if (name !== 'content-length' && name !== 'set-cookie' && !HOP_BY_HOP_HEADERS.has(name)) {
      headers[name] = value;
    }
  });
  const cookies = fetchResponse.headers.getSetCookie();
  if (cookies.length > 0) {
    headers['set-cookie'] = cookies;
  }
  if (!NULL_BODY_STATUSES.has(fetchResponse.status)) {
    headers['content-length'] = body.length;
  }
  response.writeHead(fetchResponse.status, headers);
  response.end(
    method === 'HEAD' || NULL_BODY_STATUSES.has(fetchResponse.status) ? undefined : body
  );
};

const sendError = (response: ServerResponse, statusCode: number, title: string, detail: string) => {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify({ title, detail }));
};

/**
 * Creates an HTTP forward proxy that answers requests with `fetch` instead of forwarding them.
 * Plain HTTP requests arrive in absolute form; HTTPS ones through `CONNECT` tunnels, whose TLS
 * the proxy terminates with a certificate for the requested host issued by `certificateAuthority`.
 */
export const createContractMockProxy = ({
  fetch: answer,
  certificateAuthority,
}: ContractMockProxyOptions): ContractMockProxy => {
  const tunnelOrigins = new WeakMap<Socket, string>();
  const secureContexts = new Map<string, SecureContext>();
  const sockets = new Set<Socket>();

  const handle =
    (resolveTarget: (request: IncomingMessage) => URL | undefined) =>
    async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
      const target = resolveTarget(request);
      if (!target) {
        sendError(
          response,
          400,
          'Not a proxy request',
          `${request.method} ${request.url}: the contract mock is a forward proxy; send requests through it with an absolute URL, or CONNECT for HTTPS.`
        );
        return;
      }
      try {
        const body = await readBody(request);
        await sendResponse(
          response,
          await answer(toFetchRequest(target, request, body)),
          request.method
        );
      } catch (error) {
        sendError(response, 502, 'Contract mock failed', `${request.method} ${target}: ${error}`);
      }
    };

  const proxy = createServer(
    handle(({ url = '' }) => (/^https?:\/\//i.test(url) ? new URL(url) : undefined))
  );
  const tunnel = createServer(
    handle(({ socket, url = '/' }) => {
      const origin = tunnelOrigins.get(socket);
      return origin === undefined ? undefined : new URL(url, origin);
    })
  );

  const secureContextFor = (hostname: string): SecureContext => {
    const cached = secureContexts.get(hostname);
    if (cached) {
      return cached;
    }
    const context = createSecureContext(certificateAuthority.issue(hostname));
    secureContexts.set(hostname, context);
    return context;
  };

  proxy.on('connection', (socket: Socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  proxy.on('connect', (request: IncomingMessage, clientSocket: Duplex, head: Buffer) => {
    clientSocket.on('error', () => clientSocket.destroy());
    let origin: URL;
    try {
      origin = new URL(`https://${request.url}`);
    } catch {
      clientSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length > 0) {
      clientSocket.unshift(head);
    }
    const hostname = origin.hostname.replace(/^\[(.*)\]$/, '$1');
    const tlsSocket = new TLSSocket(clientSocket, {
      isServer: true,
      secureContext: secureContextFor(hostname),
    });
    // Clients that don't trust the CA abort the handshake.
    tlsSocket.on('error', () => tlsSocket.destroy());
    tunnelOrigins.set(tlsSocket, origin.origin);
    tunnel.emit('connection', tlsSocket);
  });

  return {
    listen: (port = 0, host = '127.0.0.1') =>
      new Promise((resolve, reject) => {
        proxy.once('error', reject);
        proxy.listen(port, host, () => {
          proxy.off('error', reject);
          const address = proxy.address() as AddressInfo;
          resolve(new URL(`http://${host.includes(':') ? `[${host}]` : host}:${address.port}`));
        });
      }),
    close: () =>
      new Promise((resolve, reject) => {
        proxy.close((error) => (error ? reject(error) : resolve()));
        for (const socket of sockets) {
          socket.destroy();
        }
      }),
  };
};
