/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { REACT_FATAL_ERROR_EVENT_TYPE } from '../../lib/telemetry_events';
import { KibanaErrorBoundaryProviderDeps } from '../../types';
import { ThrowIfError } from '../ui/throw_if_error';

const MATCH_CHUNK_LOADERROR = /ChunkLoadError/;

interface ErrorServiceError {
  error: Error;
  errorInfo?: Partial<React.ErrorInfo> | null;
  name: string | null;
  isFatal: boolean;
}

interface Deps {
  analytics?: KibanaErrorBoundaryProviderDeps['analytics'];
}

/**
 * Kibana Error Boundary Services: Error Service
 * Each Error Boundary tracks an instance of this class
 * @internal
 */
export class KibanaErrorService {
  private analytics?: Deps['analytics'];

  constructor(deps: Deps) {
    this.analytics = deps.analytics;
  }

  /**
   * Determines if the error fallback UI should appear as an apologetic but promising "Refresh" button,
   * or treated with "danger" coloring and include a detailed error message.
   */
  private getIsFatal(error: Error) {
    const isChunkLoadError = MATCH_CHUNK_LOADERROR.test(error.name);
    return !isChunkLoadError; // "ChunkLoadError" is recoverable by refreshing the page
  }

  /**
   * Derive the name of the component that threw the error
   */
  private getErrorComponentName(errorInfo: Partial<React.ErrorInfo> | null) {
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

  /**
   * Creates a decorated error object
   */
  public registerError(
    error: Error,
    errorInfo: Partial<React.ErrorInfo> | null
  ): ErrorServiceError {
    const isFatal = this.getIsFatal(error);
    const name = this.getErrorComponentName(errorInfo);

    try {
      if (isFatal) {
        this.analytics?.reportEvent(REACT_FATAL_ERROR_EVENT_TYPE, {
          component_name: name,
          error_message: error.toString(),
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }

    return {
      error,
      errorInfo,
      isFatal,
      name,
    };
  }
}
