/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Socket } from 'net';
import { DetailedPeerCertificate, PeerCertificate, TLSSocket } from 'tls';
import { promisify } from 'util';
import type { IKibanaSocket } from '@kbn/core-http-server';

export class KibanaSocket implements IKibanaSocket {
  public static getFakeSocket(): IKibanaSocket {
    return {
      getPeerCertificate: () => null,
      getProtocol: () => null,
      renegotiate: () => Promise.resolve(),
    };
  }

  public get authorized() {
    return this.socket instanceof TLSSocket ? this.socket.authorized : undefined;
  }

  public get authorizationError() {
    return this.socket instanceof TLSSocket ? this.socket.authorizationError : undefined;
  }

  public get remoteAddress() {
    return this.socket.remoteAddress;
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
