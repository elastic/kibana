/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

  constructor(public readonly socket: Socket) {}

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
