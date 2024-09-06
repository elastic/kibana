/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mergeSpecs } from '../merge_specs';
import { createOASDocument } from '../../create_oas_document';

describe('OpenAPI Merger - sort tags in the result bundle', () => {
  it('sorts tags by name', async () => {
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

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
        3: spec3,
      })
    );

    expect(mergedSpec.tags).toEqual([
      { name: '1 tag', description: 'Some description' },
      { name: 'Another tag name', description: 'Another description' },
      { name: 'Some tag name', description: 'Some description' },
      { name: 'Spec3 tag name', description: 'Spec3 tag description' },
    ]);
  });

  it('sorts tags by x-displayName or name', async () => {
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
      tags: [
        { name: 'Another tag name', description: 'Another description', 'x-displayName': 'Y tag' },
      ],
    });
    const spec3 = createOASDocument({
      paths: {
        '/api/some_api': {
          put: {
            responses: {},
          },
        },
      },
      tags: [
        { name: 'Spec3 tag name', description: 'Spec3 tag description', 'x-displayName': 'X tag' },
      ],
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
        3: spec3,
      })
    );

    expect(mergedSpec.tags).toEqual([
      { name: '1 tag', description: 'Some description' },
      { name: 'Some tag name', description: 'Some description' },
      { name: 'Spec3 tag name', description: 'Spec3 tag description', 'x-displayName': 'X tag' },
      { name: 'Another tag name', description: 'Another description', 'x-displayName': 'Y tag' },
    ]);
  });
});
