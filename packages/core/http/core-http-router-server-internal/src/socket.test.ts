/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Socket } from 'net';
import { DetailedPeerCertificate, TLSSocket } from 'tls';
import { KibanaSocket } from './socket';

describe('KibanaSocket', () => {
  describe('getPeerCertificate', () => {
    it('returns `null` for net.Socket instance', () => {
      const socket = new KibanaSocket(new Socket());

      expect(socket.getPeerCertificate()).toBeNull();
    });

    it('delegates a call to tls.Socket instance', () => {
      const tlsSocket = new TLSSocket(new Socket());
      const cert = { issuerCertificate: {} } as DetailedPeerCertificate;
      const spy = jest.spyOn(tlsSocket, 'getPeerCertificate').mockImplementation(() => cert);
      const socket = new KibanaSocket(tlsSocket);
      const result = socket.getPeerCertificate(true);

      expect(spy).toBeCalledTimes(1);
      expect(spy).toBeCalledWith(true);
      expect(result).toBe(cert);
    });

    it('returns `null` if tls.Socket getPeerCertificate returns null', () => {
      const tlsSocket = new TLSSocket(new Socket());
      jest.spyOn(tlsSocket, 'getPeerCertificate').mockImplementation(() => null as any);
      const socket = new KibanaSocket(tlsSocket);

      expect(socket.getPeerCertificate()).toBeNull();
    });

    it('returns `null` if tls.Socket getPeerCertificate returns empty object', () => {
      const tlsSocket = new TLSSocket(new Socket());
      jest.spyOn(tlsSocket, 'getPeerCertificate').mockImplementation(() => ({} as any));
      const socket = new KibanaSocket(tlsSocket);

      expect(socket.getPeerCertificate()).toBeNull();
    });
  });

  describe('getProtocol', () => {
    it('returns `null` for net.Socket instance', () => {
      const socket = new KibanaSocket(new Socket());

      expect(socket.getProtocol()).toBeNull();
    });

    it('delegates a call to tls.Socket instance', () => {
      const tlsSocket = new TLSSocket(new Socket());
      const protocol = 'TLSv1.2';
      const spy = jest.spyOn(tlsSocket, 'getProtocol').mockImplementation(() => protocol);
      const socket = new KibanaSocket(tlsSocket);
      const result = socket.getProtocol();

      expect(spy).toBeCalledTimes(1);
      expect(result).toBe(protocol);
    });

    it('returns `null` if tls.Socket getProtocol returns null', () => {
      const tlsSocket = new TLSSocket(new Socket());
      jest.spyOn(tlsSocket, 'getProtocol').mockImplementation(() => null as any);
      const socket = new KibanaSocket(tlsSocket);

      expect(socket.getProtocol()).toBeNull();
    });
  });

  describe('renegotiate', () => {
    it('throws error for net.Socket instance', async () => {
      const socket = new KibanaSocket(new Socket());

      expect(() => socket.renegotiate({})).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot renegotiate a connection when TLS is not enabled."`
      );
    });

    it('delegates a call to tls.Socket instance', async () => {
      const tlsSocket = new TLSSocket(new Socket());
      const result = Symbol();
      const spy = jest.spyOn(tlsSocket, 'renegotiate').mockImplementation((_, callback) => {
        callback(result as any);
        return undefined;
      });
      const socket = new KibanaSocket(tlsSocket);

      await expect(socket.renegotiate({})).rejects.toBe(result);
      expect(spy).toBeCalledTimes(1);
    });

    it('throws error if tls.Socket renegotiate returns error', async () => {
      const tlsSocket = new TLSSocket(new Socket());
      const error = new Error('Oh no!');
      jest.spyOn(tlsSocket, 'renegotiate').mockImplementation((_, callback) => {
        callback(error);
        return undefined;
      });
      const socket = new KibanaSocket(tlsSocket);

      expect(() => socket.renegotiate({})).rejects.toThrow(error);
    });
  });

  describe('authorized', () => {
    it('returns `undefined` for net.Socket instance', () => {
      const socket = new KibanaSocket(new Socket());

      expect(socket.authorized).toBeUndefined();
    });

    it('mirrors the value of tls.Socket.authorized', () => {
      const tlsSocket = new TLSSocket(new Socket());

      tlsSocket.authorized = true;
      const socket = new KibanaSocket(tlsSocket);
      expect(tlsSocket.authorized).toBe(true);
      expect(socket.authorized).toBe(true);

      tlsSocket.authorized = false;
      expect(tlsSocket.authorized).toBe(false);
      expect(socket.authorized).toBe(false);
    });
  });

  describe('authorizationError', () => {
    it('returns `undefined` for net.Socket instance', () => {
      const socket = new KibanaSocket(new Socket());

      expect(socket.authorizationError).toBeUndefined();
    });

    it('mirrors the value of tls.Socket.authorizationError', () => {
      const tlsSocket = new TLSSocket(new Socket());
      tlsSocket.authorizationError = undefined as any;

      const socket = new KibanaSocket(tlsSocket);
      expect(tlsSocket.authorizationError).toBeUndefined();
      expect(socket.authorizationError).toBeUndefined();

      const authorizationError = new Error('some error');
      tlsSocket.authorizationError = authorizationError;

      expect(tlsSocket.authorizationError).toBe(authorizationError);
      expect(socket.authorizationError).toBe(authorizationError);
    });
  });

  describe('remoteAddress', () => {
    it('mirrors the value of net.Socket instance', () => {
      const socket = new KibanaSocket({ remoteAddress: '1.1.1.1' } as Socket);
      expect(socket.remoteAddress).toBe('1.1.1.1');
    });
  });

  describe('getFakeSocket', () => {
    it('returns a stub', async () => {
      const fakeSocket = KibanaSocket.getFakeSocket();
      expect(fakeSocket.getPeerCertificate()).toBeNull();
      expect(fakeSocket.getProtocol()).toBeNull();
      await expect(fakeSocket.renegotiate({})).resolves.toBeUndefined();
    });
  });
});
