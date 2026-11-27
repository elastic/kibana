/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HTTPAuthorizationHeader } from '../authentication';
import type { UiamAssertionSigner } from './assertion_signer';
import {
  ES_CLIENT_AUTHENTICATION_HEADER,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
  deriveUiamAttestationKey,
} from './attestation';
import type { UiamClientAuthenticationContext } from './client_authentication';
import { resolveUiamClientAuthentication } from './client_authentication';

const ATTESTATION_KEY = deriveUiamAttestationKey('a'.repeat(32));

const signer: UiamAssertionSigner = {
  subject: 'spiffe://kibana.test',
  sign: (credential) => `Assertion signed-for(${credential.toString()})`,
  isOwnAssertion: (headerValue) => headerValue.startsWith('Assertion signed-for('),
};

const CONTEXT: UiamClientAuthenticationContext = { signer, attestationKey: ATTESTATION_KEY };

// `ApiKey` and `Bearer` both carry UIAM credentials, and every rule below applies to each
// identically. Parameterized rather than picked, so neither scheme can quietly drift.
describe.each(['ApiKey', 'Bearer'] as const)('resolveUiamClientAuthentication (%s)', (scheme) => {
  const UIAM_CREDENTIAL = new HTTPAuthorizationHeader(scheme, 'essu_internal_key');
  const OWN_ASSERTION = signer.sign(UIAM_CREDENTIAL);
  const VALID_ATTESTATION = deriveInternalCallerAttestation(ATTESTATION_KEY, UIAM_CREDENTIAL);

  it('returns undefined for a non-UIAM credential, whatever its source', () => {
    const credential = new HTTPAuthorizationHeader(scheme, 'regular_key');
    expect(
      resolveUiamClientAuthentication(CONTEXT, { credentialSource: 'internal', credential })
    ).toBeUndefined();
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential,
        relayedClientAuthentication: 'upstream-shared-secret',
        requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
      })
    ).toBeUndefined();
  });

  it('returns an assertion for an internal UIAM credential, with no attestation', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'internal',
        credential: UIAM_CREDENTIAL,
      })
    ).toBe(OWN_ASSERTION);
  });

  it('returns undefined for an external (user-created) UIAM credential', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'external',
        credential: UIAM_CREDENTIAL,
      })
    ).toBeUndefined();
  });

  it('returns an assertion for an inbound UIAM credential with a valid attestation', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: undefined,
        requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
      })
    ).toBe(OWN_ASSERTION);
  });

  it.each([
    ['a secret relayed from an upstream caller', 'upstream-shared-secret'],
    ['an assertion relayed from an upstream caller', 'Assertion upstream.jwt.value'],
    ['an empty value, which is still the upstream speaking', ''],
    ['a duplicated header, as the array it arrived as', ['one', 'two']],
  ])('forwards %s for an inbound UIAM credential verbatim', (_label, relayed) => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: relayed,
        requestHeaders: {},
      })
    ).toEqual(relayed);
  });

  it('forwards relayed client authentication over a valid attestation', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: 'upstream-shared-secret',
        requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
      })
    ).toBe('upstream-shared-secret');
  });

  describe("with Kibana's own assertion as the relayed client authentication", () => {
    const STALE_OWN_ASSERTION = 'Assertion signed-for(a-credential-held-earlier)';

    it('signs again when the authentication provider set it', () => {
      expect(
        resolveUiamClientAuthentication(CONTEXT, {
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: STALE_OWN_ASSERTION,
          requestHeaders: {},
        })
      ).toBe(OWN_ASSERTION);
    });

    it('signs again when the request carried a different value', () => {
      expect(
        resolveUiamClientAuthentication(CONTEXT, {
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: STALE_OWN_ASSERTION,
          requestHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: 'upstream-shared-secret' },
        })
      ).toBe(OWN_ASSERTION);
    });

    it.each([
      ['as the header value', STALE_OWN_ASSERTION],
      ['as one of the duplicated header values', ['upstream-shared-secret', STALE_OWN_ASSERTION]],
    ])('forwards it verbatim when it arrived with the request %s', (_label, inbound) => {
      expect(
        resolveUiamClientAuthentication(CONTEXT, {
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: STALE_OWN_ASSERTION,
          requestHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: inbound },
        })
      ).toBe(STALE_OWN_ASSERTION);
    });

    it('forwards it verbatim when it arrived with the request, even with a valid attestation', () => {
      expect(
        resolveUiamClientAuthentication(CONTEXT, {
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          relayedClientAuthentication: STALE_OWN_ASSERTION,
          requestHeaders: {
            [ES_CLIENT_AUTHENTICATION_HEADER]: STALE_OWN_ASSERTION,
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION,
          },
        })
      ).toBe(STALE_OWN_ASSERTION);
    });
  });

  it('returns undefined for an inbound UIAM credential with no attestation', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: undefined,
        requestHeaders: {},
      })
    ).toBeUndefined();
  });

  it('returns undefined for an inbound UIAM credential with a forged attestation', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
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

  it('returns undefined for an attestation minted for a different credential', () => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential: UIAM_CREDENTIAL,
        relayedClientAuthentication: undefined,
        requestHeaders: {
          [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
            ATTESTATION_KEY,
            new HTTPAuthorizationHeader(scheme, 'essu_another_internal_key')
          ),
        },
      })
    ).toBeUndefined();
  });

  it.each([
    ['different length', 'short'],
    ['the attestation key', ATTESTATION_KEY.toString('hex')],
    ['duplicated header', [VALID_ATTESTATION, VALID_ATTESTATION]],
  ])('rejects an invalid attestation: %s', (_label, presented) => {
    expect(
      resolveUiamClientAuthentication(CONTEXT, {
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
      resolveUiamClientAuthentication(CONTEXT, {
        credentialSource: 'inbound',
        credential: bearer,
        relayedClientAuthentication: undefined,
        requestHeaders: {
          [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
            ATTESTATION_KEY,
            apiKey
          ),
        },
      })
    ).toBeUndefined();
  });
});
