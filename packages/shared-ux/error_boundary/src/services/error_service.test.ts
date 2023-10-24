/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaErrorService } from './error_service';

describe('KibanaErrorBoundary KibanaErrorService', () => {
  const service = new KibanaErrorService();

  it('construction', () => {
    expect(service).toHaveProperty('registerError');
  });

  it('decorates fatal error object', () => {
    const testFatal = new Error('This is an unrecognized and fatal error');
    const serviceError = service.registerError(testFatal, {});

    expect(serviceError.isFatal).toBe(true);
  });

  it('decorates recoverable error object', () => {
    const testRecoverable = new Error('Could not load chunk blah blah');
    testRecoverable.name = 'ChunkLoadError';
    const serviceError = service.registerError(testRecoverable, {});

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
});
