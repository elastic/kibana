/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateKeyPairSync, randomBytes } from 'crypto';
import { isIP } from 'net';
import { md, pki } from 'node-forge';

/** A PEM certificate and its PEM private key. */
export interface CertificateKeyPair {
  readonly cert: string;
  readonly key: string;
}

/** A certificate authority that issues server certificates for the hosts a proxy intercepts. */
export interface CertificateAuthority extends CertificateKeyPair {
  /** Returns a certificate for `hostname` (a DNS name or IP address), cached per host. */
  readonly issue: (hostname: string) => CertificateKeyPair;
}

const CA_SUBJECT = [{ name: 'commonName', value: 'Kibana connector contract mock CA' }];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CA_VALIDITY_DAYS = 365;
// Clients such as Apple's reject server certificates valid for more than 398 days.
const SERVER_VALIDITY_DAYS = 397;

const generateKeys = (): { privateKey: pki.rsa.PrivateKey; publicKey: pki.rsa.PublicKey } => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const forgeKey = pki.privateKeyFromPem(privateKey) as pki.rsa.PrivateKey;
  return {
    privateKey: forgeKey,
    publicKey: pki.setRsaPublicKey(forgeKey.n, forgeKey.e),
  };
};

// The leading 01 keeps serials positive, as RFC 5280 requires.
const serialNumber = (): string => `01${randomBytes(15).toString('hex')}`;

const validity = (cert: pki.Certificate, days: number): void => {
  const now = Date.now();
  // Backdated so clients with a slightly slow clock accept it.
  cert.validity.notBefore = new Date(now - ONE_DAY_MS);
  cert.validity.notAfter = new Date(now + days * ONE_DAY_MS);
};

const createCaCertificate = (): { cert: pki.Certificate; privateKey: pki.rsa.PrivateKey } => {
  const { privateKey, publicKey } = generateKeys();
  const cert = pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = serialNumber();
  validity(cert, CA_VALIDITY_DAYS);
  cert.setSubject(CA_SUBJECT);
  cert.setIssuer(CA_SUBJECT);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(privateKey, md.sha256.create());
  return { cert, privateKey };
};

/**
 * Creates a certificate authority for intercepting TLS, or loads one created earlier (so clients
 * configured to trust it keep working across restarts). Server certificates share one key pair.
 */
export const createCertificateAuthority = (existing?: CertificateKeyPair): CertificateAuthority => {
  const ca = existing
    ? {
        cert: pki.certificateFromPem(existing.cert),
        privateKey: pki.privateKeyFromPem(existing.key) as pki.rsa.PrivateKey,
      }
    : createCaCertificate();
  const serverKeys = generateKeys();
  const serverKey = pki.privateKeyToPem(serverKeys.privateKey);
  const caKeyIdentifier = ca.cert.generateSubjectKeyIdentifier().getBytes();
  const issued = new Map<string, CertificateKeyPair>();

  const issue = (hostname: string): CertificateKeyPair => {
    const cached = issued.get(hostname);
    if (cached) {
      return cached;
    }
    const cert = pki.createCertificate();
    cert.publicKey = serverKeys.publicKey;
    cert.serialNumber = serialNumber();
    validity(cert, SERVER_VALIDITY_DAYS);
    cert.setSubject([{ name: 'commonName', value: hostname.slice(0, 64) }]);
    cert.setIssuer(ca.cert.subject.attributes);
    cert.setExtensions([
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
      { name: 'extKeyUsage', serverAuth: true },
      {
        name: 'subjectAltName',
        altNames: [isIP(hostname) ? { type: 7, ip: hostname } : { type: 2, value: hostname }],
      },
      { name: 'authorityKeyIdentifier', keyIdentifier: caKeyIdentifier },
    ]);
    cert.sign(ca.privateKey, md.sha256.create());
    const pair = { cert: pki.certificateToPem(cert), key: serverKey };
    issued.set(hostname, pair);
    return pair;
  };

  return {
    cert: pki.certificateToPem(ca.cert),
    key: pki.privateKeyToPem(ca.privateKey),
    issue,
  };
};
