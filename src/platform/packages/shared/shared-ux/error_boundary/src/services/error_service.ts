/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { REACT_FATAL_ERROR_EVENT_TYPE } from '../../lib/telemetry_events';
import type { KibanaErrorBoundaryProviderDeps } from '../../types';
import { ThrowIfError } from '../ui/throw_if_error';

const MATCH_CHUNK_LOAD_ERROR = /ChunkLoadError/;

// Maximum duration to track for error component rendering
export const DEFAULT_MAX_ERROR_DURATION_MS = 10 * 1000; // 10 seconds

// Time window to capture transient navigation after an error
// Navigation within this window suggests the error was transient and may not have been seen by users
export const TRANSIENT_NAVIGATION_WINDOW_MS = 250;

interface ErrorServiceError {
  error: Error;
  errorInfo?: React.ErrorInfo;
  name: string | null;
  isFatal: boolean;
}

interface Deps {
  analytics?: KibanaErrorBoundaryProviderDeps['analytics'];
}

// To keep track of errors that are enqueued for later reporting
interface EnqueuedError extends ErrorServiceError {
  id: string;
  isReported: boolean;

  initialPathname: string;
  hasTransientNavigation: boolean;
  transientNavigationDetermined: boolean;

  enqueuedAt: number; // Timestamp when error was enqueued
  committedAt?: number; // Track when commit was requested (externally or auto)

  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * Kibana Error Boundary Services: Error Service
 * Each Error Boundary tracks an instance of this class
 * @internal
 */
export class KibanaErrorService {
  private analytics?: Deps['analytics'];
  private enqueuedErrors: Map<string, EnqueuedError> = new Map();

  constructor(deps: Deps) {
    this.analytics = deps.analytics;
  }

  /**
   * Determines if the error fallback UI should appear as an apologetic but promising "Refresh" button,
   * or treated with "danger" coloring and include a detailed error message.
   */
  private getIsFatal(error: Error) {
    const isChunkLoadError = MATCH_CHUNK_LOAD_ERROR.test(error.name);
    return !isChunkLoadError; // "ChunkLoadError" is recoverable by refreshing the page
  }

  /**
   * Derive the name of the component that threw the error
   */
  private getErrorComponentName(errorInfo?: React.ErrorInfo) {
    let errorComponentName: string | null = null;
    const stackLines = errorInfo?.componentStack?.split('\n');
    const errorIndicator = /^    at (\S+).*/;

    if (stackLines) {
      let i = 0;
      while (i < stackLines.length) {
        // scan the stack trace text
        if (stackLines[i].match(errorIndicator)) {
          // extract the name of the bad component
          errorComponentName = stackLines[i].replace(errorIndicator, '$1');
          // If the component is the utility for throwing errors, skip
          if (errorComponentName && errorComponentName !== ThrowIfError.name) {
            break;
          }
        }
        i++;
      }
    }

    return errorComponentName;
  }

  private getCurrentPathname(): string {
    return typeof window !== 'undefined' ? window.location.pathname : '';
  }

  public getAnalyticsReference() {
    return this.analytics;
  }

  /**
   * Enqueues an error to be reported later with timing and navigation information
   * @param error The error that was thrown
   * @param errorInfo React error info containing component stack
   * @returns An ID for the enqueued error that can be used to commit it later
   */
  public enqueueError(error: Error, errorInfo?: React.ErrorInfo): EnqueuedError {
    const isFatal = this.getIsFatal(error);
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create the enqueued error object
    const enqueuedError: EnqueuedError = {
      id,
      error,
      errorInfo,
      isFatal,
      name: this.getErrorComponentName(errorInfo),
      isReported: false,
      hasTransientNavigation: false,
      transientNavigationDetermined: false,
      initialPathname: this.getCurrentPathname(),
      enqueuedAt: Date.now(), // Set the enqueued timestamp
    };

    this.enqueuedErrors.set(id, enqueuedError);

    // Set up single timer for transient navigation check
    if (isFatal) {
      enqueuedError.timeoutId = setTimeout(() => {
        this.handleTransientNavigationCheck(id);
      }, TRANSIENT_NAVIGATION_WINDOW_MS);
    }

    return enqueuedError;
  }

  /**
   * Handles the transient navigation check after TRANSIENT_NAVIGATION_WINDOW_MS
   * @private
   */
  private handleTransientNavigationCheck(errorId: string): void {
    const enqueuedError = this.enqueuedErrors.get(errorId);
    if (!enqueuedError || enqueuedError.isReported) {
      return;
    }

    // Check for transient navigation
    const currentPathname = this.getCurrentPathname();

    enqueuedError.hasTransientNavigation = enqueuedError.initialPathname !== currentPathname;
    enqueuedError.transientNavigationDetermined = true;

    // If external commit was already requested, commit immediately
    if (enqueuedError.committedAt) {
      this.reportError(enqueuedError);
    } else {
      // Otherwise, set up timer for the remaining duration until max timeout
      const remainingTime = DEFAULT_MAX_ERROR_DURATION_MS - TRANSIENT_NAVIGATION_WINDOW_MS;
      enqueuedError.timeoutId = setTimeout(() => {
        this.reportError(enqueuedError);
      }, remainingTime);
    }
  }

  /**
   * Commits an error, ensuring transient navigation has been determined
   * @param errorId The ID of the enqueued error
   * @returns The error object or null if not found or already committed
   */
  public commitError(errorId: string): ErrorServiceError | null {
    const enqueuedError = this.enqueuedErrors.get(errorId);

    if (!enqueuedError || enqueuedError.isReported) {
      return null;
    }

    // Mark the commit timestamp
    enqueuedError.committedAt = enqueuedError.committedAt ?? Date.now();

    // If transient navigation hasn't been determined yet, just mark the request and return null
    // The handleTransientNavigationCheck will call reportError when ready
    if (!enqueuedError.transientNavigationDetermined) {
      return null;
    }

    // Transient navigation is already determined, commit immediately
    return this.reportError(enqueuedError);
  }

  /**
   * Actually reports the error telemetry
   * @private
   */
  private reportError(enqueuedError: EnqueuedError): ErrorServiceError {
    if (enqueuedError.isReported) {
      return {
        error: enqueuedError.error,
        errorInfo: enqueuedError.errorInfo,
        isFatal: enqueuedError.isFatal,
        name: enqueuedError.name,
      };
    }

    // Mark the error as reported
    enqueuedError.isReported = true;

    if (enqueuedError.timeoutId) {
      // Mark the error as committed
      enqueuedError.timeoutId = undefined;
    }

    try {
      if (enqueuedError.isFatal && this.analytics) {
        this.analytics.reportEvent(REACT_FATAL_ERROR_EVENT_TYPE, {
          component_name: enqueuedError.name,
          component_stack: enqueuedError.errorInfo?.componentStack || '',
          error_message: enqueuedError.error.toString(),
          error_stack:
            typeof enqueuedError.error.stack === 'string' ? enqueuedError.error.stack : '',
          component_render_min_duration_ms:
            (enqueuedError.committedAt ?? Date.now()) - enqueuedError.enqueuedAt,
          has_transient_navigation: enqueuedError.hasTransientNavigation,
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }

    return {
      error: enqueuedError.error,
      errorInfo: enqueuedError.errorInfo,
      isFatal: enqueuedError.isFatal,
      name: enqueuedError.name,
    };
  }
}
