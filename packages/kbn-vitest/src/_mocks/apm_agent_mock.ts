/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

/**
 * Mock for elastic-apm-node package.
 * Provides a no-op APM agent for testing.
 */
const apmAgentMock = {
  start: vi.fn(() => apmAgentMock),
  isStarted: vi.fn(() => false),
  getServiceName: vi.fn(() => 'test-service'),
  setFramework: vi.fn(),
  addFilter: vi.fn(),
  addErrorFilter: vi.fn(),
  addSpanFilter: vi.fn(),
  addTransactionFilter: vi.fn(),
  addMetadataFilter: vi.fn(),
  setUserContext: vi.fn(),
  setCustomContext: vi.fn(),
  setLabel: vi.fn(),
  addLabels: vi.fn(),
  setTransactionName: vi.fn(),
  startTransaction: vi.fn(() => ({
    name: 'test-transaction',
    type: 'test',
    end: vi.fn(),
    setLabel: vi.fn(),
    addLabels: vi.fn(),
    setOutcome: vi.fn(),
    startSpan: vi.fn(() => ({
      name: 'test-span',
      type: 'test',
      end: vi.fn(),
      setLabel: vi.fn(),
      addLabels: vi.fn(),
      setOutcome: vi.fn(),
    })),
  })),
  startSpan: vi.fn(() => ({
    name: 'test-span',
    type: 'test',
    end: vi.fn(),
    setLabel: vi.fn(),
    addLabels: vi.fn(),
    setOutcome: vi.fn(),
  })),
  currentTransaction: null,
  currentSpan: null,
  currentTraceparent: null,
  captureError: vi.fn(),
  handleUncaughtExceptions: vi.fn(),
  flush: vi.fn(() => Promise.resolve()),
  destroy: vi.fn(() => Promise.resolve()),
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
};

export { apmAgentMock };
