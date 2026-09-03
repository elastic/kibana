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
const UIAM_CREDENTIAL = new HTTPAuthorizationHeader('ApiKey', 'essu_internal_key');
const VALID_ATTESTATION = deriveInternalCallerAttestation(SHARED_SECRET, UIAM_CREDENTIAL);

describe('createCoreUiamService', () => {
  let uiam: ReturnType<typeof createCoreUiamService>;

  beforeEach(() => {
    uiam = createCoreUiamService(SHARED_SECRET);
  });

  describe('getElasticsearchClientAuthentication', () => {
    it('returns undefined for a non-UIAM credential, whatever its source', () => {
      const credential = new HTTPAuthorizationHeader('ApiKey', 'regular_key');
      expect(
        uiam.getElasticsearchClientAuthentication({ credentialSource: 'internal', credential })
      ).toBeUndefined();
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential,
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
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: VALID_ATTESTATION },
        })
      ).toBe(SHARED_SECRET);
    });

    it('returns undefined for an inbound UIAM credential with no attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
          requestHeaders: {},
        })
      ).toBeUndefined();
    });

    it('returns undefined for an inbound UIAM credential with a forged attestation', () => {
      expect(
        uiam.getElasticsearchClientAuthentication({
          credentialSource: 'inbound',
          credential: UIAM_CREDENTIAL,
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
          requestHeaders: {
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
              SHARED_SECRET,
              new HTTPAuthorizationHeader('ApiKey', 'essu_another_internal_key')
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
          requestHeaders: { [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: 'short' },
        })
      ).toBeUndefined();
    });

    it('never derives an attestation equal to the shared secret', () => {
      expect(VALID_ATTESTATION).not.toBe(SHARED_SECRET);
    });
  });
});
