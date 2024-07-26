/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Agent, Transaction } from 'elastic-apm-node';

const transaction: jest.Mocked<Transaction> = {
  addLabels: jest.fn().mockReturnValue(true),
  addLink: jest.fn(),
  addLinks: jest.fn(),
  ensureParentId: jest.fn().mockReturnValue(''),
  setLabel: jest.fn().mockReturnValue(true),
  setOutcome: jest.fn(),
  setType: jest.fn(),
  startSpan: jest.fn().mockReturnValue(null),
  end: jest.fn(),
  // Following OTel convention
  // https://github.com/open-telemetry/opentelemetry-js/blob/27897d6c34839ee722d92b12c1d55d8bdab5a0c1/api/src/trace/invalid-span-constants.ts
  ids: {
    'trace.id': '00000000000000000000000000000000',
    'transaction.id': '0000000000000000',
  },
  traceparent: '00-00000000000000000000000000000-0000000000000000-00',
  name: 'Mock Transaction',
  result: '',
  outcome: 'unknown',
  type: null,
};

/**
 * `elastic-apm-node` patches the runtime at import time
 *  causing memory leak with jest module sandbox, so it
 *  needs to be mocked for tests
 */
const agent: jest.Mocked<Agent> = {
  start: jest.fn().mockImplementation(() => agent),
  isStarted: jest.fn().mockReturnValue(false),
  getServiceName: jest.fn().mockReturnValue('mock-service'),
  getServiceVersion: jest.fn().mockReturnValue('1.0'),
  getServiceEnvironment: jest.fn().mockReturnValue('env'),
  getServiceNodeName: jest.fn().mockReturnValue('mock-node-name'),
  setFramework: jest.fn(),
  addPatch: jest.fn(),
  removePatch: jest.fn(),
  clearPatches: jest.fn(),
  lambda: jest.fn(),
  handleUncaughtExceptions: jest.fn(),
  captureError: jest.fn(),
  currentTraceparent: null,
  currentTraceIds: {},
  startTransaction: jest.fn().mockReturnValue(transaction),
  setTransactionName: jest.fn(),
  endTransaction: jest.fn(),
  currentTransaction: null,
  startSpan: jest.fn(),
  currentSpan: null,
  setLabel: jest.fn().mockReturnValue(false),
  setGlobalLabel: jest.fn(),
  addLabels: jest.fn().mockReturnValue(false),
  setUserContext: jest.fn(),
  setCustomContext: jest.fn(),
  addFilter: jest.fn(),
  addErrorFilter: jest.fn(),
  addSpanFilter: jest.fn(),
  addTransactionFilter: jest.fn(),
  addMetadataFilter: jest.fn(),
  flush: jest.fn(),
  destroy: jest.fn().mockResolvedValue(undefined),
  registerMetric: jest.fn(),
  setTransactionOutcome: jest.fn(),
  setSpanOutcome: jest.fn(),
  middleware: {
    connect: jest.fn().mockReturnValue(jest.fn()),
  },
  logger: {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  },
};

// eslint-disable-next-line import/no-default-export
export default agent;
