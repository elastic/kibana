/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { X509Certificate } from 'crypto';
import { createCertificateAuthority } from './certificate_authority';

describe('createCertificateAuthority', () => {
  const ca = createCertificateAuthority();
  const caCertificate = new X509Certificate(ca.cert);

  it('creates a self-signed CA certificate', () => {
    expect(caCertificate.ca).toBe(true);
    expect(caCertificate.verify(caCertificate.publicKey)).toBe(true);
  });

  it('issues server certificates for host names and IP addresses, signed by the CA', () => {
    const forHost = new X509Certificate(ca.issue('api.vendor.example').cert);
    const forIp = new X509Certificate(ca.issue('127.0.0.1').cert);

    expect(forHost.ca).toBe(false);
    expect(forHost.checkIssued(caCertificate)).toBe(true);
    expect(forHost.verify(caCertificate.publicKey)).toBe(true);
    expect(forHost.checkHost('api.vendor.example')).toBe('api.vendor.example');
    expect(forHost.checkHost('other.vendor.example')).toBeUndefined();
    expect(forIp.checkIP('127.0.0.1')).toBe('127.0.0.1');
  });

  it('caches server certificates per host', () => {
    expect(ca.issue('api.vendor.example')).toBe(ca.issue('api.vendor.example'));
  });

  it('loads an existing CA, whose certificates clients configured earlier still trust', () => {
    const reloaded = createCertificateAuthority({ cert: ca.cert, key: ca.key });
    const issued = new X509Certificate(reloaded.issue('api.vendor.example').cert);

    expect(reloaded.cert).toBe(ca.cert);
    expect(issued.verify(caCertificate.publicKey)).toBe(true);
  });
});
