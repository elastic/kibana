/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingMessage } from 'http';
import type { Http2ServerRequest } from 'http2';
import type { Socket } from 'net';
import type { DetailedPeerCertificate, PeerCertificate } from 'tls';
import { TLSSocket } from 'tls';
import { promisify } from 'util';
import type { IKibanaSocket } from '@kbn/core-http-server';

const isHttp2Request = (req: IncomingMessage | Http2ServerRequest): req is Http2ServerRequest =>
  'stream' in req;

/**
 * Resolves the socket that should back a {@link KibanaSocket} for the given raw request.
 *
 * For HTTP/2 requests, `req.socket` is a stream-level proxy that degrades when the stream is
 * destroyed (RST_STREAM, browser navigation, AbortController cancel). The `getPrototypeOf` trap
 * falls back from TLSSocket to Http2Stream, so `instanceof TLSSocket` returns false, causing
 * KibanaSocket accessors to return undefined/null even on live, authorized connections.
 *
 * The session-level socket (`stream.session.socket`) resolves to the underlying TLSSocket and
 * remains stable for the lifetime of the TCP connection — the correct semantic for PKI auth,
 * where the client certificate belongs to the connection, not the stream.
 *
 * Falls back to `req.socket` if the session socket is unavailable (session already destroyed, or
 * HTTP/1.1 request).
 */
export const resolveRawSocket = (req: IncomingMessage | Http2ServerRequest): Socket => {
  if (isHttp2Request(req)) {
    try {
      const sessionSocket = req.stream.session?.socket;
      if (sessionSocket) return sessionSocket;
    } catch {
      // Node throws ERR_HTTP2_SOCKET_UNBOUND when the whole session is destroyed —
      // fall through to req.socket rather than propagating.
    }
  }
  return req.socket;
};

export class KibanaSocket implements IKibanaSocket {
  public static getFakeSocket(): IKibanaSocket {
    return {
      getPeerCertificate: () => null,
      getProtocol: () => null,
      renegotiate: () => Promise.resolve(),
    };
  }

  constructor(private readonly socket: Socket) {}

  public get authorized() {
    return this.socket instanceof TLSSocket ? this.socket.authorized : undefined;
  }

  public get authorizationError() {
    return this.socket instanceof TLSSocket ? this.socket.authorizationError : undefined;
  }

  public get remoteAddress() {
    return this.socket.remoteAddress;
  }

  getPeerCertificate(detailed: true): DetailedPeerCertificate | null;
  getPeerCertificate(detailed: false): PeerCertificate | null;
  getPeerCertificate(detailed?: boolean): PeerCertificate | DetailedPeerCertificate | null;
  public getPeerCertificate(detailed?: boolean) {
    if (this.socket instanceof TLSSocket) {
      const peerCertificate = this.socket.getPeerCertificate(detailed);

      // If the peer does not provide a certificate, it returns null (if the socket has been destroyed)
      // or an empty object, so we should check for both these cases.
      if (peerCertificate && Object.keys(peerCertificate).length > 0) return peerCertificate;
    }
    return null;
  }

  public getProtocol() {
    if (this.socket instanceof TLSSocket) {
      return this.socket.getProtocol();
    }
    return null;
  }

  public async renegotiate(options: { rejectUnauthorized?: boolean; requestCert?: boolean }) {
    if (this.socket instanceof TLSSocket) {
      return promisify(this.socket.renegotiate.bind(this.socket))(options);
    }
    return Promise.reject(new Error('Cannot renegotiate a connection when TLS is not enabled.'));
  }
}
