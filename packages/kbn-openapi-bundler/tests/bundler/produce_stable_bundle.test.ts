/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

describe('OpenAPI Bundler - produce stable bundle', () => {
  it('produces stable bundle (keys are sorted)', async () => {
    const response: OpenAPIV3.ResponseObject = {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              fieldA: {
                $ref: './common.schema.yaml#/components/schemas/SchemaB',
              },
              fieldB: {
                $ref: './common.schema.yaml#/components/schemas/SchemaA',
              },
            },
          },
        },
      },
    };

    const spec1 = createOASDocument({
      paths: {
        '/api/some_api': {
          post: {
            responses: {
              '200': response,
            },
          },
          get: {
            responses: {
              '200': response,
            },
          },
          put: {
            responses: {
              '200': response,
            },
          },
        },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/another_api': {
          get: {
            responses: {
              '200': response,
            },
          },
          put: {
            responses: {
              '200': response,
            },
          },
          patch: {
            responses: {
              '200': response,
            },
          },
        },
      },
    });
    const commonSpec = createOASDocument({
      components: {
        schemas: {
          SchemaB: {
            type: 'string',
          },
          SchemaA: {
            type: 'number',
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec1,
        2: spec2,
        common: commonSpec,
      })
    );

    expect(Object.keys(bundledSpec.paths)).toEqual(['/api/another_api', '/api/some_api']);
    expect(Object.keys(bundledSpec.paths['/api/another_api']!)).toEqual(['get', 'patch', 'put']);
    expect(Object.keys(bundledSpec.paths['/api/some_api']!)).toEqual(['get', 'post', 'put']);
    expect(Object.keys(bundledSpec.components!.schemas!)).toEqual(['SchemaA', 'SchemaB']);
  });
});
