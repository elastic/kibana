/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
} from '@kbn/core-security-server';

import { createCoreUiamService } from './uiam';

const SHARED_SECRET = 'shared-secret';

// `ApiKey` and `Bearer` both carry UIAM credentials, and every rule below applies to each
// identically. Parameterized rather than picked, so neither scheme can quietly drift.
describe.each(['ApiKey', 'Bearer'] as const)('createCoreUiamService (%s)', (scheme) => {
  const UIAM_CREDENTIAL = new HTTPAuthorizationHeader(scheme, 'essu_internal_key');
  const VALID_ATTESTATION = deriveInternalCallerAttestation(SHARED_SECRET, UIAM_CREDENTIAL);

  let uiam: ReturnType<typeof createCoreUiamService>;

  beforeEach(() => {
    uiam = createCoreUiamService(SHARED_SECRET);
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

    it('returns the shared secret for an internal UIAM credential, with no attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'internal',
          credential: UIAM_CREDENTIAL,
        })
      ).toBe(SHARED_SECRET);
    });

    it('returns undefined for an external (user-created) UIAM credential', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'external',
          credential: UIAM_CREDENTIAL,
        })
      ).toBeUndefined();
    });

    it('returns the shared secret for an inbound UIAM credential with a valid attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: undefined,
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
        })
      ).toBe(SHARED_SECRET);
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

    it('forwards relayed client authentication over a valid attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: 'upstream-shared-secret',
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
        })
      ).toBe('upstream-shared-secret');
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
              'a-different-secret',
              UIAM_CREDENTIAL
            ),
          },
        })
      ).toBeUndefined();
    });

    it('returns undefined for an attestation minted for a different credential', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: undefined,
          requestHeaders: {
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
              SHARED_SECRET,
              new HTTPAuthorizationHeader(scheme, 'essu_another_internal_key')
            ),
          },
        })
      ).toBeUndefined();
    });

    it('returns undefined for an attestation of a different length (no timing-safe throw)', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: undefined,
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: 'short' },
        })
      ).toBeUndefined();
    });

    it('never derives an attestation equal to the shared secret', () => {
      expect(VALID_ATTESTATION).not.toBe(SHARED_SECRET);
    });
  });
});

describe('createCoreUiamService attestation binding', () => {
  // The attestation covers the serialized header, scheme included, so the same credentials under a
  // different scheme are a different credential and the attestation must not carry over.
  it('does not accept an attestation minted for the same credentials under another scheme', () => {
    const uiam = createCoreUiamService(SHARED_SECRET);
    const apiKey = new HTTPAuthorizationHeader('ApiKey', 'essu_internal_key');
    const bearer = new HTTPAuthorizationHeader('Bearer', 'essu_internal_key');

    expect(
      uiam.getElasticsearchClientAuthentication({
        credentialSource: 'inbound',
        credential: bearer,
        relayedClientAuthentication: undefined,
        requestHeaders: {
          [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
            SHARED_SECRET,
            apiKey
          ),
        },
      })
    ).toBeUndefined();
  });
});
