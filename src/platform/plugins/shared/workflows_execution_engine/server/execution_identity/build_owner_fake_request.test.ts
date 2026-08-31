/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isExternalUiamCredential } from '@kbn/core-security-server';
import { buildOwnerFakeRequest } from './build_owner_fake_request';
import { WorkflowExecutionIdentityMissingError } from './errors';

const encode = (id: string, secret: string) => Buffer.from(`${id}:${secret}`).toString('base64');

const build = (
  attrs: Parameters<typeof buildOwnerFakeRequest>[0]
): ReturnType<typeof buildOwnerFakeRequest> => buildOwnerFakeRequest(attrs);

describe('buildOwnerFakeRequest', () => {
  it('throws when neither key is present', () => {
    expect(() => build({ spaceId: 'default', preferUiam: false, apiKey: null })).toThrow(
      WorkflowExecutionIdentityMissingError
    );
  });

  it('throws when both keys are empty strings', () => {
    expect(() =>
      build({ spaceId: 'default', preferUiam: true, apiKey: '', uiamApiKey: '' })
    ).toThrow(WorkflowExecutionIdentityMissingError);
  });

  it('uses the ES key when UIAM is not preferred', () => {
    const fakeRequest = build({
      spaceId: 'team-a',
      preferUiam: false,
      apiKey: encode('es-1', 'es-secret'),
      uiamApiKey: 'essu_uiam',
    });

    expect(fakeRequest.isFakeRequest).toBe(true);
    expect(fakeRequest.spaceId).toBe('team-a');
    expect(fakeRequest.headers.authorization).toBe(`ApiKey ${encode('es-1', 'es-secret')}`);
    expect(isExternalUiamCredential(fakeRequest)).toBe(false);
  });

  it('uses the UIAM key when preferred and present', () => {
    const fakeRequest = build({
      spaceId: 'default',
      preferUiam: true,
      apiKey: encode('es-1', 'es-secret'),
      uiamApiKey: 'essu_uiam',
    });

    expect(fakeRequest.headers.authorization).toBe('ApiKey essu_uiam');
  });

  it('falls back to the ES key when UIAM is preferred but missing', () => {
    const fakeRequest = build({
      spaceId: 'default',
      preferUiam: true,
      apiKey: encode('es-1', 'es-secret'),
    });

    expect(fakeRequest.headers.authorization).toBe(`ApiKey ${encode('es-1', 'es-secret')}`);
  });

  it('falls back to the UIAM key when ES is preferred but missing', () => {
    const fakeRequest = build({
      spaceId: 'default',
      preferUiam: false,
      apiKey: null,
      uiamApiKey: 'essu_cloud',
    });

    expect(fakeRequest.headers.authorization).toBe('ApiKey essu_cloud');
  });

  it('unwraps a framework-stored base64 UIAM key to the raw essu_ secret', () => {
    const fakeRequest = build({
      spaceId: 'default',
      preferUiam: true,
      apiKey: null,
      uiamApiKey: encode('uiam-1', 'essu_granted'),
    });

    expect(fakeRequest.headers.authorization).toBe('ApiKey essu_granted');
  });

  it('marks the request as external when uiamApiKeyExternal is true', () => {
    const fakeRequest = build({
      spaceId: 'default',
      preferUiam: true,
      apiKey: null,
      uiamApiKey: 'essu_cloud',
      uiamApiKeyExternal: true,
    });

    expect(isExternalUiamCredential(fakeRequest)).toBe(true);
  });

  it('does not mark the request when uiamApiKeyExternal is false', () => {
    const fakeRequest = build({
      spaceId: 'default',
      preferUiam: true,
      apiKey: null,
      uiamApiKey: 'essu_granted',
      uiamApiKeyExternal: false,
    });

    expect(isExternalUiamCredential(fakeRequest)).toBe(false);
  });
});
