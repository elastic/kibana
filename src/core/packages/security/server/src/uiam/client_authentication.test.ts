/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HTTPAuthorizationHeader } from '../authentication';
import {
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
} from './attestation';
import { resolveUiamClientAuthentication } from './client_authentication';

const SHARED_SECRET = 'shared-secret';

// `ApiKey` and `Bearer` both carry UIAM credentials, and every rule below applies to each
// identically. Parameterized rather than picked, so neither scheme can quietly drift.
describe.each(['ApiKey', 'Bearer'] as const)('resolveUiamClientAuthentication (%s)', (scheme) => {
  const UIAM_CREDENTIAL = new HTTPAuthorizationHeader(scheme, 'essu_internal_key');
  const VALID_ATTESTATION = deriveInternalCallerAttestation(SHARED_SECRET, UIAM_CREDENTIAL);

  it('returns undefined for a non-UIAM credential, whatever its source', () => {
    const credential = new HTTPAuthorizationHeader(scheme, 'regular_key');
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, { credentialSource: 'internal', credential })
    ).toBeUndefined();
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'inbound',
        credential,
        relayedClientAuthentication: 'upstream-shared-secret',
        requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
      })
    ).toBeUndefined();
  });

  it('returns the shared secret for an internal UIAM credential, with no attestation', () => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'internal',
        credential: UIAM_CREDENTIAL,
      })
    ).toBe(SHARED_SECRET);
  });

  it('returns undefined for an external (user-created) UIAM credential', () => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'external',
        credential: UIAM_CREDENTIAL,
      })
    ).toBeUndefined();
  });

  it('returns the shared secret for an inbound UIAM credential with a valid attestation', () => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
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
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: relayed,
        requestHeaders: {},
      })
    ).toEqual(relayed);
  });

  it('forwards relayed client authentication over a valid attestation', () => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: 'upstream-shared-secret',
        requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
      })
    ).toBe('upstream-shared-secret');
  });

  it('returns undefined for an inbound UIAM credential with no attestation', () => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: undefined,
        requestHeaders: {},
      })
    ).toBeUndefined();
  });

  it('returns undefined for an inbound UIAM credential with a forged attestation', () => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
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
      resolveUiamClientAuthentication(SHARED_SECRET, {
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

  it.each([
    ['different length', 'short'],
    ['shared secret', SHARED_SECRET],
    ['duplicated header', [VALID_ATTESTATION, VALID_ATTESTATION]],
  ])('rejects an invalid attestation: %s', (_label, presented) => {
    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: undefined,
        requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: presented },
      })
    ).toBeUndefined();
  });
});

describe('resolveUiamClientAuthentication attestation binding', () => {
  // The attestation covers the serialized header, scheme included, so the same credentials under a
  // different scheme are a different credential and the attestation must not carry over.
  it('does not accept an attestation minted for the same credentials under another scheme', () => {
    const apiKey = new HTTPAuthorizationHeader('ApiKey', 'essu_internal_key');
    const bearer = new HTTPAuthorizationHeader('Bearer', 'essu_internal_key');

    expect(
      resolveUiamClientAuthentication(SHARED_SECRET, {
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
