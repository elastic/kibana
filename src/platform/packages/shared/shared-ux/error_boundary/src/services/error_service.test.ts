/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  KibanaErrorService,
  TRANSIENT_NAVIGATION_WINDOW_MS,
  DEFAULT_MAX_ERROR_DURATION_MS,
} from './error_service';

describe('KibanaErrorBoundary Error Service', () => {
  const mockDeps = {
    analytics: { reportEvent: jest.fn() },
  };
  const service = new KibanaErrorService(mockDeps);

  describe('Service components', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('construction', () => {
      expect(service).toHaveProperty('enqueueError');
      expect(service).toHaveProperty('commitError');
    });

    it('decorates fatal error object', () => {
      const testFatal = new Error('This is an unrecognized and fatal error');
      const enqueued = service.enqueueError(testFatal, { componentStack: '' });

      expect(enqueued.isFatal).toBe(true);
    });

    it('decorates recoverable error object', () => {
      const testRecoverable = new Error('Could not load chunk blah blah');
      testRecoverable.name = 'ChunkLoadError';
      const enqueued = service.enqueueError(testRecoverable, { componentStack: '' });

      expect(enqueued.isFatal).toBe(false);
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

      const enqueued = service.enqueueError(testFatal, errorInfo);

      expect(enqueued.name).toBe('BadComponent');
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

      const enqueued = service.enqueueError(testFatal, errorInfo);

      // should not be "ThrowIfError"
      expect(enqueued.name).toBe('BadComponent');
    });

    it('captures the error event for telemetry', () => {
      jest.resetAllMocks();
      jest.useFakeTimers();

      const testFatal = new Error('This is an outrageous and fatal error');

      const errorInfo = {
        componentStack: `
    at OutrageousMaker (http://localhost:9001/main.iframe.bundle.js:11616:73)
    `,
      };

      const enqueued = service.enqueueError(testFatal, errorInfo);

      // Fast-forward time by the monitoring navigation window to ensure error can be committed
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);

      // Commit after transient navigation window
      service.commitError(enqueued.id);

      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockDeps.analytics.reportEvent.mock.calls[0][0]).toBe('fatal-error-react');
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1]).toMatchObject({
        component_name: 'OutrageousMaker',
        error_message: 'Error: This is an outrageous and fatal error',
        has_transient_navigation: false,
      });

      jest.useRealTimers();
    });

    it('captures component stack trace and error stack trace for telemetry', () => {
      jest.resetAllMocks();
      jest.useFakeTimers();

      const testFatal = new Error('This is an outrageous and fatal error');

      const errorInfo = {
        componentStack: `
    at OutrageousMaker (http://localhost:9001/main.iframe.bundle.js:11616:73)
    `,
      };

      const enqueued = service.enqueueError(testFatal, errorInfo);

      // Fast-forward time by the monitoring navigation window to ensure error can be committed
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);

      // Commit after transient navigation window
      service.commitError(enqueued.id);

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

      jest.useRealTimers();
    });
  });

  describe('enqueueError and commitError flow', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not report non-fatal errors', () => {
      const testNonFatal = new Error('Non-fatal ChunkLoadError');
      testNonFatal.name = 'ChunkLoadError';

      // Use enqueueError directly to test the flow
      service.enqueueError(testNonFatal, { componentStack: '' });

      // Advance timers to ensure all potential reporting timeouts would fire
      jest.advanceTimersByTime(DEFAULT_MAX_ERROR_DURATION_MS + 1000);

      // Reporting should not happen for non-fatal errors
      expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('correctly waits for TRANSIENT_NAVIGATION_WINDOW_MS even when external commit happens earlier', () => {
      const testError = new Error('Test error for early commit');

      // First, enqueue the error
      const enqueuedError = service.enqueueError(testError, {
        componentStack: 'at EarlyCommitComponent',
      });

      // Simulate an external commit request at 150ms
      jest.advanceTimersByTime(150);
      service.commitError(enqueuedError.id);

      // At this point, the error should not be reported yet since we need to wait for the transient window so that navigation can be checked
      expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();

      // Now advance to the full TRANSIENT_NAVIGATION_WINDOW_MS
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS - 150);

      // Now the error should be reported
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);

      // Check that the duration is around 150ms (when commit was called) not 250ms (when it was reported)
      const reportedDuration =
        mockDeps.analytics.reportEvent.mock.calls[0][1].component_render_min_duration_ms;
      expect(reportedDuration).toBeGreaterThanOrEqual(145); // Allow small timing variance
      expect(reportedDuration).toBeLessThanOrEqual(155);
    });

    it('auto-commits after DEFAULT_MAX_ERROR_DURATION_MS if commitError is never called', () => {
      const testError = new Error('Test error for auto commit');

      // Enqueue the error but never explicitly call commitError
      service.enqueueError(testError, {
        componentStack: `
    at AutoCommitComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)
    at ErrorBoundaryInternal (http://localhost:9001/main.iframe.bundle.js:12232:81)`,
      });

      // After TRANSIENT_NAVIGATION_WINDOW_MS, it will check navigation but not report yet
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);
      expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();

      // After the full DEFAULT_MAX_ERROR_DURATION_MS, it should auto-commit
      jest.advanceTimersByTime(DEFAULT_MAX_ERROR_DURATION_MS - TRANSIENT_NAVIGATION_WINDOW_MS);

      // Now the error should be reported
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1].component_name).toBe(
        'AutoCommitComponent'
      );

      // The duration should be approximately DEFAULT_MAX_ERROR_DURATION_MS
      const reportedDuration =
        mockDeps.analytics.reportEvent.mock.calls[0][1].component_render_min_duration_ms;
      expect(reportedDuration).toBeGreaterThanOrEqual(DEFAULT_MAX_ERROR_DURATION_MS - 10); // Allow timing variance
      expect(reportedDuration).toBeLessThanOrEqual(DEFAULT_MAX_ERROR_DURATION_MS + 10);
    });

    it('correctly reports has_transient_navigation when navigation occurs within window', () => {
      // Mock getCurrentPathname to return different values on subsequent calls
      const originalGetCurrentPathname = (service as any).getCurrentPathname;
      const mockGetCurrentPathname = jest.fn();

      // First call: initial pathname
      // Second call: simulated navigation path
      mockGetCurrentPathname
        .mockReturnValueOnce('/initial-path')
        .mockReturnValueOnce('/navigated-path');

      (service as any).getCurrentPathname = mockGetCurrentPathname;

      const testError = new Error('Test error for navigation detection');

      // Enqueue the error
      const enqueuedError = service.enqueueError(testError, {
        componentStack: 'at NavigationComponent',
      });

      // Fast-forward to just when transient navigation check happens
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);

      // External commit to trigger reporting
      service.commitError(enqueuedError.id);

      // Check if navigation was correctly detected
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1].has_transient_navigation).toBe(true);

      // Restore original function
      (service as any).getCurrentPathname = originalGetCurrentPathname;
    });

    it('does not report has_transient_navigation when navigation occurs after window', () => {
      // Mock getCurrentPathname to return different values on subsequent calls
      const originalGetCurrentPathname = (service as any).getCurrentPathname;
      const mockGetCurrentPathname = jest.fn();

      // First two calls return same path (during transient window check)
      // Third call would be after the window when we're committing
      mockGetCurrentPathname
        .mockReturnValueOnce('/initial-path')
        .mockReturnValueOnce('/initial-path')
        .mockReturnValueOnce('/navigated-later-path');

      (service as any).getCurrentPathname = mockGetCurrentPathname;

      const testError = new Error('Test error for late navigation');

      // Enqueue the error
      const enqueuedError = service.enqueueError(testError, {
        componentStack: 'at LateNavigationComponent',
      });

      // Fast-forward to just when transient navigation check happens
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);

      // At this point navigation hasn't happened yet during the window

      // Fast-forward more time to simulate later navigation
      jest.advanceTimersByTime(500);

      // External commit to trigger reporting
      service.commitError(enqueuedError.id);

      // Check that has_transient_navigation is false because navigation happened after the window
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1].has_transient_navigation).toBe(false);

      // Restore original function
      (service as any).getCurrentPathname = originalGetCurrentPathname;
    });
  });

  describe('race conditions', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('handles invalid error IDs gracefully', () => {
      // Try to commit a non-existent error
      const result = service.commitError('non-existent-error-id');

      // Should return null and not throw
      expect(result).toBeNull();
      expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('handles multiple errors simultaneously without interference', () => {
      // Enqueue two separate errors
      const error1 = new Error('First test error');
      const error2 = new Error('Second test error');

      const enqueuedError1 = service.enqueueError(error1, {
        componentStack: `
    at FirstComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)`,
      });

      const enqueuedError2 = service.enqueueError(error2, {
        componentStack: `
    at SecondComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)`,
      });

      // Advance time to check transient navigation
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);

      // Commit first error
      service.commitError(enqueuedError1.id);

      // First error should be reported
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1].component_name).toBe('FirstComponent');

      jest.clearAllMocks();

      // Commit second error
      service.commitError(enqueuedError2.id);

      // Second error should be reported separately
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1].component_name).toBe(
        'SecondComponent'
      );
    });

    it('prevents re-reporting of already reported errors', () => {
      const testError = new Error('Test for re-reporting');

      const enqueuedError = service.enqueueError(testError, {
        componentStack: `
    at ReportComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)`,
      });

      // Advance time to check transient navigation
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS);

      // Commit error first time
      service.commitError(enqueuedError.id);
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      // Try to commit the same error again
      const result = service.commitError(enqueuedError.id);

      // Should return null because error was already reported
      expect(result).toBeNull();
      expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('correctly handles early user action without navigation', () => {
      // This scenario: Error occurs, user sees it briefly (<250ms) and clicks "refresh"
      // No navigation occurs but error should be reported with correct duration

      const testError = new Error('Test early user action');

      // Enqueue error
      const enqueuedError = service.enqueueError(testError, {
        componentStack: `
    at EarlyActionComponent (http://localhost:9001/main.iframe.bundle.js:11616:73)`,
      });

      // User takes action at 100ms (clicks refresh/retry/etc)
      jest.advanceTimersByTime(100);
      service.commitError(enqueuedError.id);

      // Transient check hasn't run yet (happens at 250ms)
      expect(mockDeps.analytics.reportEvent).not.toHaveBeenCalled();

      // Advance to transient check
      jest.advanceTimersByTime(TRANSIENT_NAVIGATION_WINDOW_MS - 100);

      // Now the error should be reported
      expect(mockDeps.analytics.reportEvent).toHaveBeenCalledTimes(1);

      // The duration should be 100ms (when user took action)
      const reportedDuration =
        mockDeps.analytics.reportEvent.mock.calls[0][1].component_render_min_duration_ms;
      expect(reportedDuration).toBeGreaterThanOrEqual(95);
      expect(reportedDuration).toBeLessThanOrEqual(105);

      // Transient navigation should be false (no navigation occurred)
      expect(mockDeps.analytics.reportEvent.mock.calls[0][1].has_transient_navigation).toBe(false);
    });
  });
});
