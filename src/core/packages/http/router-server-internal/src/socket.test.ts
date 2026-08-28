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
import { Socket } from 'net';
import type { DetailedPeerCertificate } from 'tls';
import { TLSSocket } from 'tls';
import { KibanaSocket, resolveRawSocket } from './socket';

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

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(true);
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

      expect(spy).toHaveBeenCalledTimes(1);
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
      expect(spy).toHaveBeenCalledTimes(1);
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

  describe('HTTP/2 stream-destruction degraded state', () => {
    // When an HTTP/2 stream is destroyed mid-request (RST_STREAM from an AbortController cancel,
    // browser navigation, or search abort), Node.js clears the stream's internal session reference.
    // The Http2ServerRequest.socket proxy's getPrototypeOf trap then falls back from the TLSSocket
    // prototype to the Http2Stream prototype, causing instanceof TLSSocket to return false.
    //
    // KibanaSocket wraps this proxy. With instanceof TLSSocket returning false, all TLS-specific
    // accessors degrade. A plain net.Socket (not TLSSocket) produces the same behaviour from
    // KibanaSocket's perspective and is used here as a test double for the destroyed-stream proxy.
    //
    // The critical invariant this tests: authorized === undefined means "socket state is unknown"
    // (the stream was destroyed before we could read it), NOT "the cert was rejected." Code that
    // reads authorized must treat undefined differently from false. See kibana#258232.

    it('returns undefined for authorized when the underlying socket is not a TLSSocket', () => {
      const socket = new KibanaSocket(new Socket());
      // undefined = state unknown; false = cert explicitly rejected. These are not equivalent.
      expect(socket.authorized).toBeUndefined();
      expect(socket.authorized).not.toBe(false);
    });

    it('returns null for getPeerCertificate when the underlying socket is not a TLSSocket', () => {
      const socket = new KibanaSocket(new Socket());
      expect(socket.getPeerCertificate(true)).toBeNull();
    });

    it('returns null for getProtocol when the underlying socket is not a TLSSocket', () => {
      const socket = new KibanaSocket(new Socket());
      expect(socket.getProtocol()).toBeNull();
    });

    it('returns undefined for authorizationError when the underlying socket is not a TLSSocket', () => {
      const socket = new KibanaSocket(new Socket());
      expect(socket.authorizationError).toBeUndefined();
    });
  });
});

describe('resolveRawSocket', () => {
  it('returns req.socket for HTTP/1.1 requests (no stream property)', () => {
    const netSocket = new Socket();
    const req = { socket: netSocket } as unknown as IncomingMessage;

    expect(resolveRawSocket(req)).toBe(netSocket);
  });

  it('returns the session-level socket for HTTP/2 requests', () => {
    const streamSocket = new Socket();
    const sessionSocket = new TLSSocket(new Socket());
    const req = {
      socket: streamSocket,
      stream: { session: { socket: sessionSocket } },
    } as unknown as Http2ServerRequest;

    expect(resolveRawSocket(req)).toBe(sessionSocket);
  });

  it('falls back to req.socket when stream.session is undefined (stream destroyed before request)', () => {
    const streamSocket = new Socket();
    const req = {
      socket: streamSocket,
      stream: { session: undefined },
    } as unknown as Http2ServerRequest;

    expect(resolveRawSocket(req)).toBe(streamSocket);
  });

  // The end-to-end counterpart of this lives in the Scout pki_stress suite. Keeping a unit lock
  // here means a regression surfaces without booting a PKI-over-HTTP/2 stack. See kibana#258232.
  it('keeps reporting the peer certificate after the HTTP/2 stream is destroyed', () => {
    const sessionSocket = new TLSSocket(new Socket());
    const peerCertificate = { subject: 'CN=first_client' } as unknown as DetailedPeerCertificate;
    jest.spyOn(sessionSocket, 'getPeerCertificate').mockReturnValue(peerCertificate);

    const req = {
      socket: new Socket(),
      stream: { session: { socket: sessionSocket } },
    } as unknown as Http2ServerRequest;

    // Resolved once, eagerly, exactly as CoreKibanaRequest does in its constructor.
    const socket = new KibanaSocket(resolveRawSocket(req));

    // Simulate RST_STREAM: Node clears `stream.session` when the stream is destroyed. Had we
    // captured `req.socket` (the stream-level Proxy) this is the point at which every TLS
    // accessor would start returning null/undefined.
    (req as unknown as { stream: { session: undefined } }).stream.session = undefined;

    expect(socket.getPeerCertificate(true)).toBe(peerCertificate);
    expect(socket.authorized).toBe(sessionSocket.authorized);
  });

  it('falls back to req.socket when session.socket throws ERR_HTTP2_SOCKET_UNBOUND', () => {
    const streamSocket = new Socket();
    const req = {
      socket: streamSocket,
      stream: {
        session: {
          get socket(): Socket {
            throw Object.assign(new Error('Session socket unbound'), {
              code: 'ERR_HTTP2_SOCKET_UNBOUND',
            });
          },
        },
      },
    } as unknown as Http2ServerRequest;

    expect(resolveRawSocket(req)).toBe(streamSocket);
  });
});
