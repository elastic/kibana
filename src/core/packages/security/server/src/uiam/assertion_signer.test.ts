/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { X509Certificate, createHash, verify } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { HTTPAuthorizationHeader } from '../authentication';
import { createUiamAssertionSigner } from './assertion_signer';

const readFixture = (name: string) =>
  readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');

const rsaCertificate = readFixture('rsa_eident.crt');
const rsaKey = readFixture('rsa_eident.key');
const ecCertificate = readFixture('ec_spiffe.crt');
const ecKey = readFixture('ec_spiffe.key');

const EIDENT_SUBJECT =
  'EIDENT.abcdef12345678901234567890123456.project.elasticsearch.type.org1234567890.organization';
const SPIFFE_SUBJECT = 'spiffe://kibana.elastic.co';
const NOW = Date.parse('2027-01-01T00:00:00Z');

const bearerCredential = new HTTPAuthorizationHeader('Bearer', 'essu_access_token');
const apiKeyCredential = new HTTPAuthorizationHeader('ApiKey', 'essu_api_key');

const decodeAssertion = (headerValue: string) => {
  expect(headerValue.startsWith('Assertion ')).toBe(true);
  const jwt = headerValue.slice('Assertion '.length);
  const [header, payload, signature] = jwt.split('.');
  return {
    signingInput: `${header}.${payload}`,
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
    signature: Buffer.from(signature, 'base64url'),
  };
};

const expectedAth = (credential: string) =>
  createHash('sha256').update(credential).digest('base64url');

describe('createUiamAssertionSigner', () => {
  describe('with an RSA key', () => {
    const signer = createUiamAssertionSigner({
      certificate: rsaCertificate,
      key: rsaKey,
      now: () => NOW,
    });

    it('issues an RS256 provenance assertion with the full certificate chain', () => {
      const { header } = decodeAssertion(signer.sign(bearerCredential));

      const chain = rsaCertificate
        .match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)!
        .map((pem) => new X509Certificate(pem).raw.toString('base64'));
      expect(chain).toHaveLength(2);
      expect(header).toEqual({ alg: 'RS256', typ: 'uiam-provenance+jwt', x5c: chain });
    });

    it('uses the eident DNS SAN verbatim as the subject', () => {
      expect(signer.subject).toBe(EIDENT_SUBJECT);
    });

    it('issues the expected claims', () => {
      const { payload } = decodeAssertion(signer.sign(bearerCredential));

      expect(payload).toEqual({
        sub: EIDENT_SUBJECT,
        aud: 'spiffe://uiam.elastic.co',
        iat: NOW / 1000,
        exp: NOW / 1000 + 30,
        ath: expectedAth('essu_access_token'),
      });
    });

    it('binds the assertion to the bare credential, whatever its scheme', () => {
      expect(decodeAssertion(signer.sign(apiKeyCredential)).payload.ath).toBe(
        expectedAth('essu_api_key')
      );
    });

    it('honors a custom lifetime', () => {
      const shortLivedSigner = createUiamAssertionSigner({
        certificate: rsaCertificate,
        key: rsaKey,
        lifetimeSeconds: 5,
        now: () => NOW,
      });

      const { payload } = decodeAssertion(shortLivedSigner.sign(bearerCredential));
      expect(payload.exp - payload.iat).toBe(5);
    });

    it('produces a signature that verifies with the leaf certificate', () => {
      const { signingInput, signature } = decodeAssertion(signer.sign(bearerCredential));
      const [leafPem] = rsaCertificate.match(
        /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
      )!;

      expect(
        verify(
          'sha256',
          Buffer.from(signingInput),
          new X509Certificate(leafPem).publicKey,
          signature
        )
      ).toBe(true);
    });

    it('refuses to sign once the certificate has expired', () => {
      const expiredSigner = createUiamAssertionSigner({
        certificate: rsaCertificate,
        key: rsaKey,
        now: () => Date.parse('2100-01-01T00:00:00Z'),
      });

      expect(() => expiredSigner.sign(bearerCredential)).toThrowError(/the certificate expired at/);
    });
  });

  describe('with a P-256 key', () => {
    const signer = createUiamAssertionSigner({
      certificate: ecCertificate,
      key: ecKey,
      now: () => NOW,
    });

    it('prefers the SPIFFE URI SAN over the eident DNS SAN', () => {
      expect(signer.subject).toBe(SPIFFE_SUBJECT);
      expect(decodeAssertion(signer.sign(bearerCredential)).payload.sub).toBe(SPIFFE_SUBJECT);
    });

    it('issues an ES256 assertion with a raw 64-byte signature', () => {
      const { header, signingInput, signature } = decodeAssertion(signer.sign(bearerCredential));

      expect(header.alg).toBe('ES256');
      expect(signature).toHaveLength(64);
      expect(
        verify(
          'sha256',
          Buffer.from(signingInput),
          { key: new X509Certificate(ecCertificate).publicKey, dsaEncoding: 'ieee-p1363' },
          signature
        )
      ).toBe(true);
    });
  });

  describe('validation', () => {
    it('rejects input without certificates', () => {
      expect(() => createUiamAssertionSigner({ certificate: '', key: rsaKey })).toThrowError(
        /contains no certificates/
      );
    });

    it('rejects a key that does not match the certificate', () => {
      expect(() =>
        createUiamAssertionSigner({
          certificate: rsaCertificate,
          key: readFixture('rsa_no_identity.key'),
        })
      ).toThrowError(/does not match the certificate/);
    });

    it('rejects unsupported curves', () => {
      expect(() =>
        createUiamAssertionSigner({
          certificate: readFixture('ec_p384.crt'),
          key: readFixture('ec_p384.key'),
        })
      ).toThrowError(/unsupported key type \[ec\/secp384r1\]/);
    });

    it('rejects a certificate without a SPIFFE or eident identity', () => {
      expect(() =>
        createUiamAssertionSigner({
          certificate: readFixture('rsa_no_identity.crt'),
          key: readFixture('rsa_no_identity.key'),
        })
      ).toThrowError(/neither a SPIFFE URI SAN nor an eident DNS SAN/);
    });
  });

  describe('#isOwnAssertion', () => {
    const signer = createUiamAssertionSigner({ certificate: rsaCertificate, key: rsaKey });

    it('recognizes its own assertions', () => {
      expect(signer.isOwnAssertion(signer.sign(bearerCredential))).toBe(true);
    });

    it('recognizes its own expired assertions', () => {
      const pastSigner = createUiamAssertionSigner({
        certificate: rsaCertificate,
        key: rsaKey,
        now: () => NOW,
      });

      expect(signer.isOwnAssertion(pastSigner.sign(bearerCredential))).toBe(true);
    });

    it('rejects assertions signed with another key', () => {
      const otherSigner = createUiamAssertionSigner({ certificate: ecCertificate, key: ecKey });

      expect(signer.isOwnAssertion(otherSigner.sign(bearerCredential))).toBe(false);
    });

    it('rejects tampered assertions', () => {
      const [prefix, jwt] = signer.sign(bearerCredential).split(' ');
      const [header, payload, signature] = jwt.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({
          ...JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')),
          ath: expectedAth('essu_other'),
        })
      ).toString('base64url');

      expect(signer.isOwnAssertion(`${prefix} ${header}.${tamperedPayload}.${signature}`)).toBe(
        false
      );
    });

    it.each([
      ['a shared secret', 'some-shared-secret'],
      ['an empty value', ''],
      ['a malformed assertion', 'Assertion not-a-jwt'],
      ['a lowercase scheme', signer.sign(bearerCredential).replace('Assertion', 'assertion')],
      ['garbage parts', 'Assertion a.b.c'],
    ])('rejects %s', (_, value) => {
      expect(signer.isOwnAssertion(value)).toBe(false);
    });
  });
});
