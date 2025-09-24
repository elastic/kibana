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

// Maximum duration to track for error component rendering (10 seconds)
export const DEFAULT_MAX_ERROR_DURATION_MS = 10 * 1000; // 10 seconds

// Time to wait before checking if navigation occurred after an error
export const MONITOR_NAVIGATION_WITHIN_MS = 250;

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
  startTime: number;
  isCommitted: boolean;
  id: string;

  initialPathname: string;
  hasSubsequentNavigation: boolean;

  timeoutIdCommitError?: ReturnType<typeof setTimeout>;
  committedAt?: number; // Track when commit was first requested
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
      while (i < stackLines.length - 1) {
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

    // Create the enqueued error object with timing information
    const enqueuedError: EnqueuedError = {
      id,
      error,
      errorInfo,
      isFatal,
      name: this.getErrorComponentName(errorInfo),
      startTime: Date.now(),
      isCommitted: false,
      hasSubsequentNavigation: false,
      initialPathname: this.getCurrentPathname(),
    };

    // Auto commit the error after DEFAULT_MAX_ERROR_DURATION_MS to ensure it doesn't linger indefinitely
    if (isFatal) {
      enqueuedError.timeoutIdCommitError = setTimeout(() => {
        this.commitError(id);
      }, DEFAULT_MAX_ERROR_DURATION_MS);
    }

    this.enqueuedErrors.set(id, enqueuedError);

    return enqueuedError;
  }

  /**
   * Commits an error, ensuring at least MONITOR_NAVIGATION_WITHIN_MS has passed for navigation check
   * @param errorId The ID of the enqueued error
   * @returns The error object or null if not found or already committed
   */
  public commitError(errorId: string): ErrorServiceError | null {
    const enqueuedError = this.enqueuedErrors.get(errorId);

    if (!enqueuedError || enqueuedError.isCommitted) {
      return null;
    }

    const now = Date.now();

    // If not already elapsed, wait at least MONITOR_NAVIGATION_WITHIN_MS to check for navigation
    // This is needed as to capture visually unseen errors, absorbed by navigation
    const timeSinceEnqueue = now - enqueuedError.startTime;
    if (timeSinceEnqueue < MONITOR_NAVIGATION_WITHIN_MS) {
      const remainingWait = MONITOR_NAVIGATION_WITHIN_MS - timeSinceEnqueue;
      if (enqueuedError.timeoutIdCommitError) clearTimeout(enqueuedError.timeoutIdCommitError);
      enqueuedError.timeoutIdCommitError = setTimeout(() => {
        this.commitError(errorId);
      }, remainingWait);
      return null;
    }

    // Mark the error as committed
    enqueuedError.isCommitted = true;
    enqueuedError.committedAt = !enqueuedError.committedAt ? now : enqueuedError.committedAt;
    if (enqueuedError.timeoutIdCommitError) {
      clearTimeout(enqueuedError.timeoutIdCommitError);
    }

    try {
      if (enqueuedError.isFatal && this.analytics) {
        this.analytics.reportEvent(REACT_FATAL_ERROR_EVENT_TYPE, {
          component_name: enqueuedError.name,
          component_stack: enqueuedError.errorInfo?.componentStack || '',
          error_message: enqueuedError.error.toString(),
          error_stack:
            enqueuedError.error instanceof Error && typeof enqueuedError.error.stack === 'string'
              ? enqueuedError.error.stack
              : '',
          component_render_min_duration_ms: enqueuedError.committedAt - enqueuedError.startTime,
          has_subsequent_navigation:
            enqueuedError.hasSubsequentNavigation ||
            enqueuedError.initialPathname !== this.getCurrentPathname(),
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

  /**
   * Creates a decorated error object and reports it immediately
   * @deprecated Use enqueueError and commitError for better timing information
   */
  public registerError(error: Error, errorInfo?: React.ErrorInfo): ErrorServiceError {
    // Enqueue and immediately commit the error
    const enqueuedError = this.enqueueError(error, errorInfo);
    const result = this.commitError(enqueuedError.id);

    if (!result) {
      // Fallback in case of any issues with the enqueue/commit flow
      return {
        error,
        errorInfo,
        isFatal: this.getIsFatal(error),
        name: this.getErrorComponentName(errorInfo),
      };
    }

    return result;
  }
}
