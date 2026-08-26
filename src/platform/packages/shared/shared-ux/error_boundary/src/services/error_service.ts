/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { ThrowIfError } from '../ui/throw_if_error';

const MATCH_CHUNK_LOAD_ERROR = /ChunkLoadError/;

interface ErrorServiceError {
  error: Error;
  errorInfo?: React.ErrorInfo;
  name: string | null;
  isFatal: boolean;
}

/**
 * Kibana Error Boundary Services: Error Service
 * Each Error Boundary tracks an instance of this class
 * @internal
 */
export class KibanaErrorService {
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

  /**
   * Classifies a caught error for the fallback UI (fatal vs recoverable, component name).
   * Error content is reported to APM RUM by the error boundary, not via EBT.
   */
  public enqueueError(error: Error, errorInfo?: React.ErrorInfo): ErrorServiceError {
    return {
      error,
      errorInfo,
      isFatal: this.getIsFatal(error),
      name: this.getErrorComponentName(errorInfo),
    };
  }
}
