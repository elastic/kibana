/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import type { UiamAssertionSigner } from '@kbn/core-security-server';
import {
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
  deriveUiamAttestationKey,
} from '@kbn/core-security-server';

import { createCoreUiamService, createUiamClientAuthenticationContext } from './uiam';

const ENCRYPTION_KEY = 'a'.repeat(32);
const ATTESTATION_KEY = deriveUiamAttestationKey(ENCRYPTION_KEY);

const signer: UiamAssertionSigner = {
  subject: 'spiffe://kibana.test',
  sign: (credential) => `Assertion signed-for(${credential.toString()})`,
  isOwnAssertion: () => false,
};

// `ApiKey` and `Bearer` both carry UIAM credentials, and every rule below applies to each
// identically. Parameterized rather than picked, so neither scheme can quietly drift.
describe.each(['ApiKey', 'Bearer'] as const)('createCoreUiamService (%s)', (scheme) => {
  const UIAM_CREDENTIAL = new HTTPAuthorizationHeader(scheme, 'essu_internal_key');
  const OWN_ASSERTION = signer.sign(UIAM_CREDENTIAL);
  const VALID_ATTESTATION = deriveInternalCallerAttestation(ATTESTATION_KEY, UIAM_CREDENTIAL);

  let uiam: ReturnType<typeof createCoreUiamService>;

  beforeEach(() => {
    uiam = createCoreUiamService({ signer, attestationKey: ATTESTATION_KEY });
  });

  describe('getElasticsearchClientAuthentication', () => {
    it('returns undefined for a non-UIAM credential, whatever its source', () => {
      const credential = new HTTPAuthorizationHeader(scheme, 'regular_key');
      expect(
        uiam.getElasticsearchClientAuthentication({ credentialSource: 'internal', credential })
      ).toBeUndefined();
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential,
          relayedClientAuthentication: 'upstream-shared-secret',
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
        })
      ).toBeUndefined();
    });

    it('returns an assertion for an internal UIAM credential, with no attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'internal',
          credential: UIAM_CREDENTIAL,
        })
      ).toBe(OWN_ASSERTION);
    });

    it('returns undefined for an external (user-created) UIAM credential', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'external',
          credential: UIAM_CREDENTIAL,
        })
      ).toBeUndefined();
    });

    it('returns an assertion for an inbound UIAM credential with a valid attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: undefined,
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
        })
      ).toBe(OWN_ASSERTION);
    });

    it.each([
      ['a secret relayed from an upstream caller', 'upstream-shared-secret'],
      ['an empty value, which is still the upstream speaking', ''],
      ['a duplicated header, as the array it arrived as', ['one', 'two']],
    ])('forwards %s for an inbound UIAM credential verbatim', (_label, relayed) => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: relayed,
          requestHeaders: {},
        })
      ).toEqual(relayed);
    });

    it('returns undefined for an inbound UIAM credential with no attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: undefined,
          requestHeaders: {},
        })
      ).toBeUndefined();
    });

    it('returns undefined for an inbound UIAM credential with a forged attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: undefined,
          requestHeaders: {
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
              deriveUiamAttestationKey('b'.repeat(32)),
              UIAM_CREDENTIAL
            ),
          },
        })
      ).toBeUndefined();
    });
  });
});

describe('createUiamClientAuthenticationContext', () => {
  it('builds a signer from the UIAM client certificate and key', () => {
    const context = createUiamClientAuthenticationContext({
      encryptionKey: ENCRYPTION_KEY,
      uiam: { ssl: { certificate: KBN_CERT_PATH, key: KBN_KEY_PATH } },
    });

    expect(context.signer.subject).toMatch(/^EIDENT\./);
    expect(context.signer.sign(new HTTPAuthorizationHeader('Bearer', 'essu_token'))).toMatch(
      /^Assertion [\w-]+\.[\w-]+\.[\w-]+$/
    );
  });

  it('derives the attestation key from the encryption key', () => {
    const context = createUiamClientAuthenticationContext({
      encryptionKey: ENCRYPTION_KEY,
      uiam: { ssl: { certificate: KBN_CERT_PATH, key: KBN_KEY_PATH } },
    });

    expect(context.attestationKey.equals(ATTESTATION_KEY)).toBe(true);
  });

  it.each([
    ['the certificate', { key: KBN_KEY_PATH }],
    ['the key', { certificate: KBN_CERT_PATH }],
    ['both', undefined],
  ])('throws when %s is not configured', (_label, ssl) => {
    expect(() =>
      createUiamClientAuthenticationContext({ encryptionKey: ENCRYPTION_KEY, uiam: { ssl } })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[xpack.security.uiam.ssl.certificate] and [xpack.security.uiam.ssl.key] must be set when UIAM is enabled."`
    );
  });

  it('throws when the encryption key is not set explicitly', () => {
    expect(() =>
      createUiamClientAuthenticationContext({
        uiam: { ssl: { certificate: KBN_CERT_PATH, key: KBN_KEY_PATH } },
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[xpack.security.encryptionKey] must be set explicitly when UIAM is enabled."`
    );
  });
});
