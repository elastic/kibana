/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

export class ErrorService {
  /**
   * Derive the name of the component that threw the error
   */
  public getErrorComponentName(errorInfo: Partial<React.ErrorInfo> | null) {
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
          if (errorComponentName) {
            break;
          }
        }
        i++;
      }
    }

    return { errorComponentName };
  }

  onError(error: Error) {
    // TODO: telemetry
  }
}
