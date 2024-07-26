/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createOASDocument } from '../create_oas_document';
import { mergeSpecs } from './merge_specs';

describe('OpenAPI Merger - different OpenAPI versions', () => {
  it('merges specs having OpenAPI 3.0.x versions', async () => {
    const spec1 = createOASDocument({
      openapi: '3.0.3',
      paths: {
        '/api/some/path': {},
      },
    });
    const spec2 = createOASDocument({
      openapi: '3.0.0',
      paths: {
        '/api/some/path': {},
      },
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(mergedSpec.openapi).toBe('3.0.3');
  });

  it('throws an error when different minor OAS versions encountered', async () => {
    const spec1 = createOASDocument({
      openapi: '3.0.3',
      paths: {
        '/api/some/path': {},
      },
    });
    const spec2 = createOASDocument({
      openapi: '3.1.0',
      paths: {
        '/api/some/path': {},
      },
    });

    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError(/OpenAPI specs must use the same OpenAPI version/);
  });

  it('throws an error when different OAS 3.1.x patch versions encountered', async () => {
    const spec1 = createOASDocument({
      openapi: '3.1.0',
      paths: {
        '/api/some/path': {},
      },
    });
    const spec2 = createOASDocument({
      openapi: '3.1.1',
      paths: {
        '/api/some/path': {},
      },
    });

    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError(/OpenAPI specs must use the same OpenAPI version/);
  });
});
