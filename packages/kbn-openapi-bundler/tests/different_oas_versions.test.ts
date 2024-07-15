/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - different OAS versions', () => {
  it('DOES NOT bundle specs with different OpenAPI versions', async () => {
    const spec1 = createOASDocument({
      openapi: '3.0.3',
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const spec2 = createOASDocument({
      openapi: '3.1.0',
      paths: {
        '/api/some_api': {
          put: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    await expect(
      bundleSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError(new RegExp('^OpenAPI specs must use the same OpenAPI version'));
  });
});
