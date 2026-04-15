/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getImportsMap } from './get_imports_map';
import type { OpenApiDocument } from '../openapi_types';

describe('getImportsMap', () => {
  it('does not include external refs that appear only under non-200 responses on paths', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/only404': {
          get: {
            responses: {
              '404': {
                description: 'Not found',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '../errors.schema.yaml#/components/schemas/OnlyIn404',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(getImportsMap(doc)).toEqual({});
  });

  it('includes external refs from 200 responses but not refs that appear only under 404', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/mixed': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '../success.schema.yaml#/components/schemas/SuccessBody',
                    },
                  },
                },
              },
              '404': {
                description: 'err',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '../errors.schema.yaml#/components/schemas/ErrorBody',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(getImportsMap(doc)).toEqual({
      '../success.gen': ['SuccessBody'],
    });
  });

  it('still discovers external refs that appear only under components.schemas', () => {
    const doc: OpenApiDocument = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {},
      components: {
        schemas: {
          Wrapper: {
            $ref: '../shared.schema.yaml#/components/schemas/SharedType',
          },
        },
      },
    };
    expect(getImportsMap(doc)).toEqual({
      '../shared.gen': ['SharedType'],
    });
  });
});
