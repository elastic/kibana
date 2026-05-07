/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { PeerCertificate } from 'tls';

import {
  buildGrpcVerifyOptions,
  buildHttpsAgentTlsOptions,
  resolveTlsMaterial,
  toGrpcRootCerts,
} from './otel_tls';

describe('resolveTlsMaterial', () => {
  let dir: string;
  beforeEach(() => {
    dir = join(tmpdir(), `otel-tls-test-${process.pid}-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns undefined when ssl is absent', () => {
    expect(resolveTlsMaterial(undefined)).toBeUndefined();
  });

  it('reads PEM files from paths', () => {
    const caPath = join(dir, 'ca.pem');
    const pemContent = '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----';
    writeFileSync(caPath, pemContent, 'utf8');

    const resolved = resolveTlsMaterial({
      certificateAuthorities: caPath,
      verificationMode: 'full',
    });
    expect(resolved?.ca?.toString()).toBe(pemContent);
  });

  it('accepts inline PEM for certificate authorities', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nINLINE\n-----END CERTIFICATE-----';
    const resolved = resolveTlsMaterial({ certificateAuthorities: pem, verificationMode: 'full' });
    expect(resolved?.ca?.toString()).toBe(pem);
  });

  it('loads multiple CAs from an array of paths', () => {
    const ca1 = join(dir, 'ca1.pem');
    const ca2 = join(dir, 'ca2.pem');
    writeFileSync(ca1, '-----BEGIN CERTIFICATE-----\nONE\n-----END CERTIFICATE-----');
    writeFileSync(ca2, '-----BEGIN CERTIFICATE-----\nTWO\n-----END CERTIFICATE-----');

    const resolved = resolveTlsMaterial({
      certificateAuthorities: [ca1, ca2],
      verificationMode: 'full',
    });
    expect(Array.isArray(resolved?.ca)).toBe(true);
    expect((resolved?.ca as Buffer[]).map((b) => b.toString())).toEqual([
      '-----BEGIN CERTIFICATE-----\nONE\n-----END CERTIFICATE-----',
      '-----BEGIN CERTIFICATE-----\nTWO\n-----END CERTIFICATE-----',
    ]);
  });

  it('throws a clear error when a certificate path is unreadable', () => {
    expect(() =>
      resolveTlsMaterial({
        certificateAuthorities: join(dir, 'nope.pem'),
        verificationMode: 'full',
      })
    ).toThrow(/Unable to load ssl\.certificateAuthorities\[0\]/);
  });

  it('resolves client certificate and key', () => {
    const certPath = join(dir, 'client.crt');
    const keyPath = join(dir, 'client.key');
    writeFileSync(certPath, '-----BEGIN CERTIFICATE-----\nCERT\n-----END CERTIFICATE-----');
    writeFileSync(keyPath, '-----BEGIN PRIVATE KEY-----\nKEY\n-----END PRIVATE KEY-----');

    const resolved = resolveTlsMaterial({
      certificate: certPath,
      key: keyPath,
      keyPassphrase: 'secret',
      verificationMode: 'full',
    });
    expect(resolved?.cert?.toString()).toContain('CERT');
    expect(resolved?.key?.toString()).toContain('KEY');
    expect(resolved?.passphrase).toBe('secret');
  });

  it('applies verificationMode only', () => {
    const resolved = resolveTlsMaterial({ verificationMode: 'none' });
    expect(resolved?.verificationMode).toBe('none');
    expect(resolved?.ca).toBeUndefined();
  });
});

describe('buildHttpsAgentTlsOptions', () => {
  it('maps verification modes to Node TLS options', () => {
    const none = buildHttpsAgentTlsOptions({
      verificationMode: 'none',
    });
    expect(none.rejectUnauthorized).toBe(false);

    const full = buildHttpsAgentTlsOptions({
      verificationMode: 'full',
    });
    expect(full.rejectUnauthorized).toBe(true);
    expect(full.checkServerIdentity).toBeUndefined();

    const cert = buildHttpsAgentTlsOptions({
      verificationMode: 'certificate',
    });
    expect(cert.rejectUnauthorized).toBe(true);
    expect(cert.checkServerIdentity?.('h', {} as PeerCertificate)).toBeUndefined();
  });
});

describe('buildGrpcVerifyOptions', () => {
  it('matches HTTPS semantics for verification modes', () => {
    expect(buildGrpcVerifyOptions({ verificationMode: 'none' })).toEqual({
      rejectUnauthorized: false,
    });
    expect(buildGrpcVerifyOptions({ verificationMode: 'full' })).toEqual({
      rejectUnauthorized: true,
    });
    const mid = buildGrpcVerifyOptions({ verificationMode: 'certificate' });
    expect(mid.rejectUnauthorized).toBe(true);
    expect(mid.checkServerIdentity?.('h', {} as PeerCertificate)).toBeUndefined();
  });
});

describe('toGrpcRootCerts', () => {
  it('returns null when no CA is configured', () => {
    expect(toGrpcRootCerts({ verificationMode: 'full' })).toBeNull();
  });

  it('returns a single buffer for one CA', () => {
    const b = Buffer.from('ca');
    expect(toGrpcRootCerts({ verificationMode: 'full', ca: b })).toEqual(b);
  });

  it('concatenates multiple CAs', () => {
    const merged = toGrpcRootCerts({
      verificationMode: 'full',
      ca: [Buffer.from('a'), Buffer.from('b')],
    });
    expect(merged?.toString()).toBe('a\nb');
  });
});
