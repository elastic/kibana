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

describe('extractAuthzDescription', () => {
  it('should return undefined if route does not require privileges', () => {
    const route: InternalRouterRoute = {
      path: '/foo',
      options: { access: 'internal' },
      handler: jest.fn(),
      validationSchemas: { request: { body: schema.object({}) } },
      method: 'get',
      isVersioned: false,
    };
    const description = extractAuthzDescription(route, 'traditional');
    expect(description).toBe(undefined);
  });

  it('should return route authz description for simple privileges', () => {
    const route: InternalRouterRoute = {
      path: '/foo',
      options: { access: 'public' },
      handler: jest.fn(),
      validationSchemas: { request: { body: schema.object({}) } },
      method: 'get',
      isVersioned: false,
      security: {
        authz: {
          requiredPrivileges: ['manage_spaces'],
        },
      },
    };
    const description = extractAuthzDescription(route, 'traditional');
    expect(description).toBe('[Authz] Route required privileges: ALL of [manage_spaces].');
  });

  it('should return route authz description for privilege groups', () => {
    {
      const route: InternalRouterRoute = {
        path: '/foo',
        options: { access: 'public' },
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
        method: 'get',
        isVersioned: false,
        security: {
          authz: {
            requiredPrivileges: [{ allRequired: ['console'], anyRequired: ['manage_spaces'] }],
          },
        },
      };
      const description = extractAuthzDescription(route, 'traditional');
      expect(description).toBe(
        '[Authz] Route required privileges: ALL of [console] AND ANY of [manage_spaces].'
      );
    }
    {
      const route: InternalRouterRoute = {
        path: '/foo',
        options: { access: 'public' },
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
        method: 'get',
        isVersioned: false,
        security: {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['console', 'filesManagement'],
                anyRequired: ['manage_spaces', 'taskmanager'],
              },
            ],
          },
        },
      };
      const description = extractAuthzDescription(route, 'traditional');
      expect(description).toBe(
        '[Authz] Route required privileges: ALL of [console, filesManagement] AND ANY of [manage_spaces OR taskmanager].'
      );
    }
  });
});
