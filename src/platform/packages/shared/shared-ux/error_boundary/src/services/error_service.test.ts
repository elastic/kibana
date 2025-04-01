/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KibanaErrorService } from './error_service';

describe('KibanaErrorBoundary Error Service', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  const mockDeps = {
    analytics: { reportEvent: jest.fn() },
  };
  const service = new KibanaErrorService(mockDeps);

  it('construction', () => {
    expect(service).toHaveProperty('registerError');
  });

  it('decorates fatal error object', () => {
    const testFatal = new Error('This is an unrecognized and fatal error');
    const serviceError = service.registerError(testFatal, { componentStack: '' });

    expect(serviceError.isFatal).toBe(true);
  });

  it('decorates recoverable error object', () => {
    const testRecoverable = new Error('Could not load chunk blah blah');
    testRecoverable.name = 'ChunkLoadError';
    const serviceError = service.registerError(testRecoverable, { componentStack: '' });

    expect(serviceError.isFatal).toBe(false);
  });

  it('derives component name', () => {
    const testFatal = new Error('This is an unrecognized and fatal error');

    const errorInfo = {
      componentStack: `
    at BadComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)
    at ErrorBoundaryInternal (http://localhost:9001/main.iframe.bundle.js:12232:81)
    at KibanaErrorBoundary (http://localhost:9001/main.iframe.bundle.js:12295:116)
    at KibanaErrorBoundaryDepsProvider (http://localhost:9001/main.iframe.bundle.js:11879:23)
    at div
    at http://localhost:9001/kbn-ui-shared-deps-npm.dll.js:164499:73
    at section
    at http://localhost:9001/kbn-ui-shared-deps-npm.dll.js`,
    };

    const serviceError = service.registerError(testFatal, errorInfo);

    expect(serviceError.name).toBe('BadComponent');
  });

  it('passes the common helper utility when deriving component name', () => {
    const testFatal = new Error('This is an mind-bendingly fatal error');

    const errorInfo = {
      componentStack: `
    at ThrowIfError (http://localhost:9001/main.iframe.bundle.js:11616:73)
    at BadComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)
    at ErrorBoundaryInternal (http://localhost:9001/main.iframe.bundle.js:12232:81)
    at KibanaErrorBoundary (http://localhost:9001/main.iframe.bundle.js:12295:116)
    at KibanaErrorBoundaryDepsProvider (http://localhost:9001/main.iframe.bundle.js:11879:23)
    at div
    at http://localhost:9001/kbn-ui-shared-deps-npm.dll.js:164499:73
    at section
    at http://localhost:9001/kbn-ui-shared-deps-npm.dll.js`,
    };

    const serviceError = service.registerError(testFatal, errorInfo);

    // should not be "ThrowIfError"
    expect(serviceError.name).toBe('BadComponent');
  });

  it('captures the error event for telemetry', () => {
    jest.resetAllMocks();
    const testFatal = new Error('This is an outrageous and fatal error');

    const errorInfo = {
      componentStack: `
    at OutrageousMaker (http://localhost:9001/main.iframe.bundle.js:11616:73)
    `,
    };

    service.registerError(testFatal, errorInfo);

    expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockDeps.analytics.reportEvent.mock.calls[0][0]).toBe('fatal-error-react');
    expect(mockDeps.analytics.reportEvent.mock.calls[0][1]).toMatchObject({
      component_name: 'OutrageousMaker',
      error_message: 'Error: This is an outrageous and fatal error',
    });
  });

  it('captures component stack trace and error stack trace for telemetry', () => {
    jest.resetAllMocks();
    const testFatal = new Error('This is an outrageous and fatal error');

    const errorInfo = {
      componentStack: `
    at OutrageousMaker (http://localhost:9001/main.iframe.bundle.js:11616:73)
    `,
    };

    service.registerError(testFatal, errorInfo);

    expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(mockDeps.analytics.reportEvent.mock.calls[0][0]).toBe('fatal-error-react');
    expect(
      String(mockDeps.analytics.reportEvent.mock.calls[0][1].component_stack).includes(
        'at OutrageousMaker'
      )
    ).toBe(true);
    expect(
      String(mockDeps.analytics.reportEvent.mock.calls[0][1].error_stack).startsWith(
        'Error: This is an outrageous and fatal error'
      )
    ).toBe(true);
  });
});
