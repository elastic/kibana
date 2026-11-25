/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KeyObject } from 'crypto';
import {
  X509Certificate,
  createHash,
  createPrivateKey,
  sign as signData,
  verify as verifySignature,
} from 'crypto';
import { LRUCache } from 'lru-cache';

import type { HTTPAuthorizationHeader } from '../authentication';

/**
 * Scheme that marks a signed provenance assertion in the `x-client-authentication` header.
 */
export const UIAM_ASSERTION_SCHEME = 'Assertion';

const ASSERTION_TYPE = 'uiam-provenance+jwt';
const ASSERTION_AUDIENCE = 'spiffe://uiam.elastic.co';
const DEFAULT_LIFETIME_SECONDS = 30;
// An assertion is reused for this share of its lifetime, so a reused one always has at least the
// rest of it left to reach UIAM.
const REUSABLE_LIFETIME_SHARE = 2 / 3;
const ASSERTION_CACHE_MAX_SIZE = 1000;
const CERTIFICATE_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;
const EIDENT_DNS_PREFIX = 'eident.';

type AssertionAlgorithm = 'RS256' | 'ES256';

/**
 * Signs UIAM provenance assertions with Kibana's UIAM client certificate key.
 */
export interface UiamAssertionSigner {
  /** The certificate identity the assertions are issued for (`sub` claim). */
  readonly subject: string;
  /**
   * Returns the `x-client-authentication` header value (`Assertion <jwt>`) bound to the given
   * credential. The same assertion is returned for a credential until two thirds of its lifetime
   * have passed, so repeated calls do not each pay for a signature.
   */
  sign(credential: HTTPAuthorizationHeader): string;
  /**
   * Whether the header value is an assertion signed with this signer's key for its subject,
   * regardless of its expiration.
   */
  isOwnAssertion(headerValue: string): boolean;
}

/**
 * Parameters of {@link createUiamAssertionSigner}.
 */
export interface UiamAssertionSignerParams {
  /** PEM certificate chain, leaf first. */
  certificate: string;
  /** PEM private key that matches the leaf certificate. */
  key: string;
  /** Lifetime of every assertion, in seconds. */
  lifetimeSeconds?: number;
  /** Clock in milliseconds since the Unix epoch. */
  now?: () => number;
}

const toBase64Url = (value: string | Buffer) => Buffer.from(value).toString('base64url');

const getAssertionAlgorithm = (privateKey: KeyObject): AssertionAlgorithm => {
  if (privateKey.asymmetricKeyType === 'rsa') {
    return 'RS256';
  }

  if (
    privateKey.asymmetricKeyType === 'ec' &&
    privateKey.asymmetricKeyDetails?.namedCurve === 'prime256v1'
  ) {
    return 'ES256';
  }

  throw new Error(
    `UIAM assertion signer: unsupported key type [${privateKey.asymmetricKeyType}${
      privateKey.asymmetricKeyDetails?.namedCurve
        ? `/${privateKey.asymmetricKeyDetails.namedCurve}`
        : ''
    }], only RSA and P-256 keys are supported.`
  );
};

const parseSubjectAltNames = (subjectAltName: string | undefined) =>
  (subjectAltName ?? '')
    .split(', ')
    .map((entry) => {
      const separatorIndex = entry.indexOf(':');
      const type = entry.slice(0, separatorIndex);
      const rawValue = entry.slice(separatorIndex + 1);
      const value = rawValue.startsWith('"') ? (JSON.parse(rawValue) as string) : rawValue;
      return { type, value };
    })
    .filter(({ type, value }) => type.length > 0 && value.length > 0);

const getAssertionSubject = (leaf: X509Certificate) => {
  const subjectAltNames = parseSubjectAltNames(leaf.subjectAltName);

  const spiffeId = subjectAltNames.find(
    ({ type, value }) => type === 'URI' && value.startsWith('spiffe://')
  );
  if (spiffeId) {
    return spiffeId.value;
  }

  const eident = subjectAltNames.find(
    ({ type, value }) => type === 'DNS' && value.toLowerCase().startsWith(EIDENT_DNS_PREFIX)
  );
  if (eident) {
    return eident.value;
  }

  throw new Error(
    'UIAM assertion signer: the certificate has neither a SPIFFE URI SAN nor an eident DNS SAN.'
  );
};

/**
 * Creates a {@link UiamAssertionSigner} from Kibana's UIAM client certificate chain and key.
 */
export function createUiamAssertionSigner({
  certificate,
  key,
  lifetimeSeconds = DEFAULT_LIFETIME_SECONDS,
  now = Date.now,
}: UiamAssertionSignerParams): UiamAssertionSigner {
  const chain = (certificate.match(CERTIFICATE_PATTERN) ?? []).map(
    (pem) => new X509Certificate(pem)
  );
  if (chain.length === 0) {
    throw new Error('UIAM assertion signer: the certificate file contains no certificates.');
  }

  const [leaf] = chain;
  const privateKey = createPrivateKey(key);
  if (!leaf.checkPrivateKey(privateKey)) {
    throw new Error('UIAM assertion signer: the key does not match the certificate.');
  }

  const algorithm = getAssertionAlgorithm(privateKey);
  const subject = getAssertionSubject(leaf);
  const leafExpiresAt = new Date(leaf.validTo).getTime();
  const dsaOptions = algorithm === 'ES256' ? { dsaEncoding: 'ieee-p1363' as const } : {};
  const encodedHeader = toBase64Url(
    JSON.stringify({
      alg: algorithm,
      typ: ASSERTION_TYPE,
      x5c: chain.map((cert) => cert.raw.toString('base64')),
    })
  );
  const reusableForMs = lifetimeSeconds * 1000 * REUSABLE_LIFETIME_SHARE;
  // Keyed by the hash of the credential, so the credential itself is never held.
  const assertions = new LRUCache<string, { value: string; issuedAtMs: number }>({
    max: ASSERTION_CACHE_MAX_SIZE,
  });

  return Object.freeze({
    subject,

    sign(credential: HTTPAuthorizationHeader) {
      const currentTime = now();
      if (currentTime >= leafExpiresAt) {
        throw new Error(`UIAM assertion signer: the certificate expired at ${leaf.validTo}.`);
      }

      const credentialHash = createHash('sha256')
        .update(credential.credentials)
        .digest('base64url');
      const cached = assertions.get(credentialHash);
      // An assertion issued in the future means the clock moved back, so it is signed again.
      if (
        cached &&
        currentTime >= cached.issuedAtMs &&
        currentTime - cached.issuedAtMs < reusableForMs
      ) {
        return cached.value;
      }

      const issuedAt = Math.floor(currentTime / 1000);
      const encodedPayload = toBase64Url(
        JSON.stringify({
          sub: subject,
          aud: ASSERTION_AUDIENCE,
          iat: issuedAt,
          exp: issuedAt + lifetimeSeconds,
          ath: credentialHash,
        })
      );
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const signature = signData('sha256', Buffer.from(signingInput), {
        key: privateKey,
        ...dsaOptions,
      });

      const value = `${UIAM_ASSERTION_SCHEME} ${signingInput}.${signature.toString('base64url')}`;
      assertions.set(credentialHash, { value, issuedAtMs: issuedAt * 1000 });
      return value;
    },

    isOwnAssertion(headerValue: string) {
      const prefix = `${UIAM_ASSERTION_SCHEME} `;
      if (!headerValue.startsWith(prefix)) {
        return false;
      }

      const parts = headerValue.slice(prefix.length).split('.');
      if (parts.length !== 3) {
        return false;
      }

      const [encodedAssertionHeader, encodedPayload, encodedSignature] = parts;
      try {
        const isSignedByThisKey = verifySignature(
          'sha256',
          Buffer.from(`${encodedAssertionHeader}.${encodedPayload}`),
          { key: leaf.publicKey, ...dsaOptions },
          Buffer.from(encodedSignature, 'base64url')
        );
        if (!isSignedByThisKey) {
          return false;
        }

        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
        return payload?.sub === subject;
      } catch {
        return false;
      }
    },
  });
}
