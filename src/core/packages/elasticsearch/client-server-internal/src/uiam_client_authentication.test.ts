/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Headers } from '@kbn/core-http-server';
import {
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
  deriveInternalCallerAttestation,
} from '@kbn/core-security-server';
import { createCoreUiamService } from '@kbn/core-security-server-internal';

import { ES_CLIENT_AUTHENTICATION_HEADER } from './headers';
import { resolveUiamClientAuthentication } from './uiam_client_authentication';

const SHARED_SECRET = 'shared-secret';

describe('resolveUiamClientAuthentication', () => {
  let uiam: ReturnType<typeof createCoreUiamService>;
  let getElasticsearchClientAuthentication: jest.SpyInstance;

  beforeEach(() => {
    const service = createCoreUiamService(SHARED_SECRET);
    getElasticsearchClientAuthentication = jest.fn(service.getElasticsearchClientAuthentication);
    uiam = { getElasticsearchClientAuthentication } as unknown as typeof service;
  });

  const resolve = ({
    credential = new HTTPAuthorizationHeader('Bearer', 'essu_token'),
    effectiveHeaders = {},
    attestationHeaders,
    isExternalCredential = false,
    withUiam = true,
  }: {
    credential?: HTTPAuthorizationHeader | null;
    effectiveHeaders?: Headers;
    attestationHeaders?: Headers;
    isExternalCredential?: boolean;
    withUiam?: boolean;
  } = {}) =>
    resolveUiamClientAuthentication({
      uiam: withUiam ? uiam : undefined,
      credential,
      effectiveHeaders,
      attestationHeaders,
      isExternalCredential,
    });

  const attestationFor = (
    credential: HTTPAuthorizationHeader,
    secret = SHARED_SECRET
  ): Headers => ({
    [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(secret, credential),
  });

  describe('when there is nothing to decide', () => {
    it('returns undefined when UIAM is not enabled', () => {
      expect(resolve({ withUiam: false })).toBeUndefined();
    });

    it('returns undefined when the request carries no credential', () => {
      expect(resolve({ credential: null })).toBeUndefined();
      expect(getElasticsearchClientAuthentication).not.toHaveBeenCalled();
    });

    it('returns undefined for a non-UIAM credential', () => {
      const credential = new HTTPAuthorizationHeader('ApiKey', 'not_a_uiam_key');
      expect(
        resolve({ credential, attestationHeaders: attestationFor(credential) })
      ).toBeUndefined();
    });
  });

  describe('when client authentication has already been resolved', () => {
    it.each([
      ['a secret relayed from an upstream caller', 'upstream-shared-secret'],
      ['an empty value, which is still the upstream speaking', ''],
    ])('forwards %s verbatim without consulting UIAM', (_label, value) => {
      const credential = new HTTPAuthorizationHeader('Bearer', 'essu_token');
      expect(
        resolve({
          credential,
          effectiveHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: value },
          attestationHeaders: attestationFor(credential),
        })
      ).toBe(value);
      expect(getElasticsearchClientAuthentication).not.toHaveBeenCalled();
    });

    it('forwards a duplicated header as the array it arrived as', () => {
      expect(
        resolve({ effectiveHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: ['one', 'two'] } })
      ).toEqual(['one', 'two']);
    });

    it('wins over an attestation, so a token bound to another client keeps its own secret', () => {
      const credential = new HTTPAuthorizationHeader('Bearer', 'essu_token');
      expect(
        resolve({
          credential,
          effectiveHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: 'upstream-shared-secret' },
          attestationHeaders: attestationFor(credential),
        })
      ).toBe('upstream-shared-secret');
    });
  });

  describe('when an attestation decides', () => {
    it.each(['ApiKey', 'Bearer'] as const)(
      'returns the shared secret for an attested %s credential',
      (scheme) => {
        const credential = new HTTPAuthorizationHeader(scheme, 'essu_token');
        expect(resolve({ credential, attestationHeaders: attestationFor(credential) })).toBe(
          SHARED_SECRET
        );
        expect(getElasticsearchClientAuthentication).toHaveBeenCalledWith(
          expect.objectContaining({ credentialSource: 'inbound' })
        );
      }
    );

    it('returns undefined when no attestation rode in', () => {
      expect(resolve({ attestationHeaders: {} })).toBeUndefined();
    });

    it('returns undefined for an attestation minted under another secret', () => {
      const credential = new HTTPAuthorizationHeader('Bearer', 'essu_token');
      expect(
        resolve({ credential, attestationHeaders: attestationFor(credential, 'another-secret') })
      ).toBeUndefined();
    });

    it('returns undefined for an attestation bound to another credential', () => {
      const other = new HTTPAuthorizationHeader('Bearer', 'essu_another_token');
      expect(resolve({ attestationHeaders: attestationFor(other) })).toBeUndefined();
    });
  });

  describe('when Kibana vouches for the credential itself', () => {
    it('returns the shared secret when no attestation is asked for', () => {
      expect(resolve({ attestationHeaders: undefined })).toBe(SHARED_SECRET);
      expect(getElasticsearchClientAuthentication).toHaveBeenCalledWith(
        expect.objectContaining({ credentialSource: 'internal' })
      );
    });

    it('returns undefined for a credential marked as user-created', () => {
      expect(
        resolve({ attestationHeaders: undefined, isExternalCredential: true })
      ).toBeUndefined();
      expect(getElasticsearchClientAuthentication).toHaveBeenCalledWith(
        expect.objectContaining({ credentialSource: 'external' })
      );
    });
  });
});
