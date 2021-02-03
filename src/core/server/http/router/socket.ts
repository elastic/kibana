/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Socket } from 'net';
import { DetailedPeerCertificate, PeerCertificate, TLSSocket } from 'tls';
import { promisify } from 'util';

/**
 * A tiny abstraction for TCP socket.
 * @public
 */
export interface IKibanaSocket {
  getPeerCertificate(detailed: true): DetailedPeerCertificate | null;
  getPeerCertificate(detailed: false): PeerCertificate | null;
  /**
   * Returns an object representing the peer's certificate.
   * The returned object has some properties corresponding to the field of the certificate.
   * If detailed argument is true the full chain with issuer property will be returned,
   * if false only the top certificate without issuer property.
   * If the peer does not provide a certificate, it returns null.
   * @param detailed - If true; the full chain with issuer property will be returned.
   * @returns An object representing the peer's certificate.
   */
  getPeerCertificate(detailed?: boolean): PeerCertificate | DetailedPeerCertificate | null;

  /**
   * Returns a string containing the negotiated SSL/TLS protocol version of the current connection. The value 'unknown' will be returned for
   * connected sockets that have not completed the handshaking process. The value null will be returned for server sockets or disconnected
   * client sockets. See https://www.openssl.org/docs/man1.0.2/ssl/SSL_get_version.html for more information.
   */
  getProtocol(): string | null;

  /**
   * Renegotiates a connection to obtain the peer's certificate. This cannot be used when the protocol version is TLSv1.3.
   * @param options - The options may contain the following fields: rejectUnauthorized, requestCert (See tls.createServer() for details).
   * @returns A Promise that will be resolved if renegotiation succeeded, or will be rejected if renegotiation failed.
   */
  renegotiate(options: { rejectUnauthorized?: boolean; requestCert?: boolean }): Promise<void>;

  /**
   * Indicates whether or not the peer certificate was signed by one of the specified CAs. When TLS
   * isn't used the value is `undefined`.
   */
  readonly authorized?: boolean;

  /**
   * The reason why the peer's certificate has not been verified. This property becomes available
   * only when `authorized` is `false`.
   */
  readonly authorizationError?: Error;
}

export class KibanaSocket implements IKibanaSocket {
  public get authorized() {
    return this.socket instanceof TLSSocket ? this.socket.authorized : undefined;
  }
  public get authorizationError() {
    return this.socket instanceof TLSSocket ? this.socket.authorizationError : undefined;
  }

  constructor(private readonly socket: Socket) {}

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
