/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { extractAuthzDescription } from './extract_authz_description';
import { InternalRouterRoute } from './type';
import { RouteSecurity } from '@kbn/core-http-server';

describe('extractAuthzDescription', () => {
  it('should return empty if route does not require privileges', () => {
    const route: InternalRouterRoute = {
      path: '/foo',
      options: { access: 'internal' },
      handler: jest.fn(),
      validationSchemas: { request: { body: schema.object({}) } },
      method: 'get',
      isVersioned: false,
    };
    const description = extractAuthzDescription(route.security);
    expect(description).toBe('');
  });

  it('should return route authz description for simple privileges', () => {
    const routeSecurity: RouteSecurity = {
      authz: {
        requiredPrivileges: ['manage_spaces'],
      },
    };
    const description = extractAuthzDescription(routeSecurity);
    expect(description).toBe(
      '[Required authorization] Route required privileges: ALL of [manage_spaces].'
    );
  });

  it('should return route authz description for privilege groups', () => {
    {
      const routeSecurity: RouteSecurity = {
        authz: {
          requiredPrivileges: [{ allRequired: ['console'] }],
        },
      };
      const description = extractAuthzDescription(routeSecurity);
      expect(description).toBe(
        '[Required authorization] Route required privileges: ALL of [console].'
      );
    }
    {
      const routeSecurity: RouteSecurity = {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: ['manage_spaces', 'taskmanager'],
            },
          ],
        },
      };
      const description = extractAuthzDescription(routeSecurity);
      expect(description).toBe(
        '[Required authorization] Route required privileges: ANY of [manage_spaces OR taskmanager].'
      );
    }
    {
      const routeSecurity: RouteSecurity = {
        authz: {
          requiredPrivileges: [
            {
              allRequired: ['console', 'filesManagement'],
              anyRequired: ['manage_spaces', 'taskmanager'],
            },
          ],
        },
      };
      const description = extractAuthzDescription(routeSecurity);
      expect(description).toBe(
        '[Required authorization] Route required privileges: ALL of [console, filesManagement] AND ANY of [manage_spaces OR taskmanager].'
      );
    }
  });
});
