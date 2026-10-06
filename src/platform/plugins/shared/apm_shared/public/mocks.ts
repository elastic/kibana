/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ApmSharedPluginStart } from './types';

export type Start = jest.Mocked<ApmSharedPluginStart>;

const createStartContract = (): Start => {
  return {
    callApmApi: jest.fn(),
    FocusedTraceWaterfallWithFetching: jest.fn(({ traceId }) =>
      React.createElement(
        'div',
        { 'data-test-subj': 'focused-trace-waterfall-with-fetching' },
        traceId
      )
    ),
    TraceWaterfallWithFetching: jest.fn(({ traceId }) =>
      React.createElement('div', { 'data-test-subj': 'trace-waterfall-with-fetching' }, traceId)
    ),
    TraceWaterfall: jest.fn(({ traceItems }) =>
      React.createElement(
        'div',
        { 'data-test-subj': 'trace-waterfall' },
        `${traceItems?.length ?? 0} items`
      )
    ),
  };
};

export const apmSharedMock = {
  createStartContract,
};
