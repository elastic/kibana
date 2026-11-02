/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { markExternalUiamCredential, isExternalUiamCredential } from './external_credential';

const createRequest = ({
  isFakeRequest = true,
  authorization = 'ApiKey essu_user_created_key',
}: { isFakeRequest?: boolean; authorization?: string } = {}) =>
  ({ isFakeRequest, headers: { authorization } } as unknown as KibanaRequest);

describe('external UIAM credential marker', () => {
  it('reports an unmarked request as internal', () => {
    expect(isExternalUiamCredential(createRequest())).toBe(false);
  });

  it('reports a marked request as external', () => {
    const request = createRequest();
    markExternalUiamCredential(request);
    expect(isExternalUiamCredential(request)).toBe(true);
  });

  it('is bound to the request instance, so another request with the same headers is not marked', () => {
    markExternalUiamCredential(createRequest());
    expect(isExternalUiamCredential(createRequest())).toBe(false);
  });

  it('refuses to mark a real request', () => {
    expect(() => markExternalUiamCredential(createRequest({ isFakeRequest: false }))).toThrow(
      'markExternalUiamCredential must only be called on a fake request.'
    );
  });

  it('drops the verdict when the authorization header is swapped after marking', () => {
    const request = createRequest();
    markExternalUiamCredential(request);
    (request.headers as { authorization: string }).authorization = 'ApiKey essu_another_key';
    expect(isExternalUiamCredential(request)).toBe(false);
  });
});
