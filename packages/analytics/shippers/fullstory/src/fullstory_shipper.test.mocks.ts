/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FullStoryApi } from './types';

export const fullStoryApiMock: jest.Mocked<FullStoryApi> = {
  identify: jest.fn(),
  setUserVars: jest.fn(),
  setVars: jest.fn(),
  consent: jest.fn(),
  restart: jest.fn(),
  shutdown: jest.fn(),
  event: jest.fn(),
};
jest.doMock('./load_snippet', () => {
  return {
    loadSnippet: () => fullStoryApiMock,
  };
});
