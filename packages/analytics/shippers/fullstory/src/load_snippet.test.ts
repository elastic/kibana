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
      value: {},
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

    Object.defineProperty(global, '_fs_script', {
      writable: true,
      value: '',
    });
  });

  it('should return the FullStory API', () => {
    const fullStoryApi = loadSnippet({ debug: true, fullStoryOrgId: 'foo' });
    expect(fullStoryApi).toBeDefined();
    expect(fullStoryApi.event).toBeDefined();
    expect(fullStoryApi.consent).toBeDefined();
    expect(fullStoryApi.restart).toBeDefined();
    expect(fullStoryApi.shutdown).toBeDefined();
    expect(fullStoryApi.identify).toBeDefined();
    expect(fullStoryApi.setUserVars).toBeDefined();
    expect(fullStoryApi.setVars).toBeDefined();
  });
});
