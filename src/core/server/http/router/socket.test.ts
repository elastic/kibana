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
import { DetailedPeerCertificate, TLSSocket } from 'tls';
import { KibanaSocket } from './socket';

describe('KibanaSocket', () => {
  describe('getPeerCertificate', () => {
    it('returns null for net.Socket instance', () => {
      const socket = new KibanaSocket(new Socket());

      expect(socket.getPeerCertificate()).toBe(null);
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

    it('returns null if tls.Socket getPeerCertificate returns null', () => {
      const tlsSocket = new TLSSocket(new Socket());
      jest.spyOn(tlsSocket, 'getPeerCertificate').mockImplementation(() => null as any);
      const socket = new KibanaSocket(tlsSocket);

      expect(socket.getPeerCertificate()).toBe(null);
    });

    it('returns null if tls.Socket getPeerCertificate returns empty object', () => {
      const tlsSocket = new TLSSocket(new Socket());
      jest.spyOn(tlsSocket, 'getPeerCertificate').mockImplementation(() => ({} as any));
      const socket = new KibanaSocket(tlsSocket);

      expect(socket.getPeerCertificate()).toBe(null);
    });
  });
});
