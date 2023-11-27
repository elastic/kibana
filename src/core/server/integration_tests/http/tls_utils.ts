/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Server as NodeHttpServer } from 'http';
import { Server as NodeTlsServer } from 'https';
import tls from 'tls';

export function isServerTLS(server: NodeHttpServer): server is NodeTlsServer {
  return 'setSecureContext' in server;
}

export const fetchPeerCertificate = (host: string, port: number) => {
  return new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
    const socket = tls.connect({ host, port: Number(port), rejectUnauthorized: false });
    socket.once('secureConnect', () => {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();
      resolve(cert);
    });
    socket.once('error', reject);
  });
};

export const flattenCertificateChain = (
  cert: tls.DetailedPeerCertificate,
  accumulator: tls.DetailedPeerCertificate[] = []
) => {
  accumulator.push(cert);
  if (cert.issuerCertificate && cert.fingerprint256 !== cert.issuerCertificate.fingerprint256) {
    flattenCertificateChain(cert.issuerCertificate, accumulator);
  }
  return accumulator;
};
