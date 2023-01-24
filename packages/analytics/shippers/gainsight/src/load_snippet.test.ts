/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loadSnippet } from './load_snippet';

describe('loadSnippet', () => {
  beforeAll(() => {
    // Define necessary window and document global variables for the tests
    Object.defineProperty(global, 'window', {
      writable: true,
      value: {
        aptrinsic: {
          init: true,
        },
      },
    });

    Object.defineProperty(global, 'document', {
      writable: true,
      value: {
        createElement: jest.fn().mockReturnValue({}),
        getElementsByTagName: jest
          .fn()
          .mockReturnValue([{ parentNode: { insertBefore: jest.fn() } }]),
      },
    });

    Object.defineProperty(global, 'aptrinsic', {
      writable: true,
      value: {
        init: true,
      },
    });
  });

  it('should return the gainsight API', () => {
    const gainsightApi = loadSnippet({ gainsightOrgId: 'foo' });
    expect(gainsightApi).toBeDefined();
  });
});
