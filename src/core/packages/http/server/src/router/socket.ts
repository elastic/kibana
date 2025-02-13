/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DetailedPeerCertificate, PeerCertificate } from 'tls';

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

  /**
   * The string representation of the remote IP address. For example,`'74.125.127.100'` or
   * `'2001:4860:a005::68'`. Value may be `undefined` if the socket is destroyed (for example, if
   * the client disconnected).
   */
  readonly remoteAddress?: string;
}
