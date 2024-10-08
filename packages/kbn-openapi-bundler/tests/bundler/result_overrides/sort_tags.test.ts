/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from '../bundle_specs';
import { createOASDocument } from '../../create_oas_document';

describe('OpenAPI Bundler - sort tags', () => {
  it('sorts tags in the result bundle', async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {},
          },
        },
      },
      tags: [
        { name: 'Some tag name', description: 'Some description' },
        { name: '1 tag', description: 'Some description' },
      ],
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/some_api': {
          post: {
            responses: {},
          },
        },
      },
      tags: [{ name: 'Another tag name', description: 'Another description' }],
    });
    const spec3 = createOASDocument({
      paths: {
        '/api/some_api': {
          put: {
            responses: {},
          },
        },
      },
      tags: [{ name: 'Spec3 tag name', description: 'Spec3 tag description' }],
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec1,
        2: spec2,
        3: spec3,
      })
    );

    expect(bundledSpec.tags).toEqual([
      { name: '1 tag', description: 'Some description' },
      { name: 'Another tag name', description: 'Another description' },
      { name: 'Some tag name', description: 'Some description' },
      { name: 'Spec3 tag name', description: 'Spec3 tag description' },
    ]);
  });
});
