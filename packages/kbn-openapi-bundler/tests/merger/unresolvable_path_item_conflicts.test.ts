/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createOASDocument } from '../create_oas_document';
import { mergeSpecs } from './merge_specs';

describe('OpenAPI Merger - unresolvable path item object conflicts', () => {
  it.each([
    [
      'summary',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            summary: 'Summary A',
            get: {
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            summary: 'Summary B',
            get: {
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'description',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            description: 'Description A',
            get: {
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            description: 'Description B',
            get: {
              responses: {},
            },
          },
        },
      }),
    ],
  ])('throws an error when path items %s do not match', async (_, spec1, spec2) => {
    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError(/value .+ doesn't match to already encountered/);
  });

  it("throws an error when path item's parameters do not match", async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          parameters: [
            {
              name: 'param1',
              in: 'path',
            },
          ],
          get: {
            responses: {},
          },
        },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          parameters: [
            {
              name: 'param1',
              in: 'path',
              required: true,
            },
          ],
          get: {
            responses: {},
          },
        },
      },
    });

    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError('definition is duplicated and differs from previously encountered');
  });

  it('throws an error when path item has a top level $ref', async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          get: {
            responses: {},
          },
        },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          $ref: '#/components/schemas/PathItemDefinition',
        },
      },
      components: {
        schemas: {
          PathItemDefinition: {},
        },
      },
    });

    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError('Path item top level $ref is not supported');
  });
});
