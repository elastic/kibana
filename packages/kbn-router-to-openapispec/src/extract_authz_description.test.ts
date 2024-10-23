/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractAuthzDescription } from './extract_authz_description';

describe('extractAuthzDescription', () => {
  const testRouter = {
    getRoutes: () => [
      {
        path: '/foo',
        options: { access: 'internal', deprecated: true, discontinued: 'discontinued router' },
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        path: '/bar',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        path: '/baz',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        path: '/qux',
        method: 'post',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
        security: {
          authz: {
            requiredPrivileges: [
              'manage_spaces',
              {
                allRequired: ['taskmanager'],
                anyRequired: ['console'],
              },
            ],
          },
        },
      },
    ],
  } as unknown as Router;
});
