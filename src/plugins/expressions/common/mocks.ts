/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Adapters } from '@kbn/inspector-plugin/common';
import { ExecutionContext } from './execution/types';

export const createMockExecutionContext = <
  ExtraContext extends object = object,
  ExtraAdapters extends Adapters = Adapters
>(
  extraContext: ExtraContext = {} as ExtraContext,
  extraAdapters: ExtraAdapters = {} as ExtraAdapters
): ExecutionContext<ExtraAdapters> & ExtraContext => {
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
      ...extraAdapters,
    },
    allowCache: false,
  } as unknown as ExecutionContext<ExtraAdapters>;

  return {
    ...executionContext,
    ...extraContext,
  };
};
