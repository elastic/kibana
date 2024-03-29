/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from './execution/types';

export const createMockExecutionContext = <ExtraContext extends object = object>(
  extraContext: ExtraContext = {} as ExtraContext
): ExecutionContext & ExtraContext => {
  const executionContext = {
    getSearchContext: jest.fn(),
    getSearchSessionId: jest.fn(),
    getExecutionContext: jest.fn(),
    variables: {},
    types: {},
    abortSignal: {
      aborted: false,
      addEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onabort: jest.fn(),
      removeEventListener: jest.fn(),
    },
    inspectorAdapters: {
      requests: {},
      data: {},
    },
  } as unknown as ExecutionContext;

  return {
    ...executionContext,
    ...extraContext,
  };
};
