/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { InternalSecurityServiceStart } from './internal_contracts';
import { CoreSecurityRouteHandlerContext } from './security_route_handler_context';

describe('CoreSecurityRouteHandlerContext', () => {
  it('binds authc.getCurrentUser and authc.getPrincipal to the context request', () => {
    const request = httpServerMock.createKibanaRequest();
    const principal = { type: 'user' as const, username: 'jdoe' };
    const getCurrentUser = jest.fn().mockReturnValue(null);
    const getPrincipal = jest.fn().mockReturnValue(principal);
    // Only the members the `authc` getter touches are needed.
    const securityStart = {
      authc: { getCurrentUser, getPrincipal, apiKeys: { uiam: null } },
    } as unknown as InternalSecurityServiceStart;

    const context = new CoreSecurityRouteHandlerContext(securityStart, request);

    expect(context.authc.getCurrentUser()).toBeNull();
    expect(getCurrentUser).toHaveBeenCalledWith(request);

    expect(context.authc.getPrincipal()).toBe(principal);
    expect(getPrincipal).toHaveBeenCalledWith(request);
  });
});
