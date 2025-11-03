/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { KibanaErrorBoundaryServices } from '../../types';

export interface BaseErrorBoundaryProps {
  services: KibanaErrorBoundaryServices;
}

export interface BaseErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  componentName: string | null;
  isFatal: boolean | null;
  errorId?: string;
}

/**
 * Base error boundary component for error handling
 * Subclasses must implement their own componentDidCatch and error reporting
 */
export abstract class BaseErrorBoundary<
  P extends BaseErrorBoundaryProps,
  S extends BaseErrorBoundaryState
> extends React.Component<P, S> {
  private beforeUnloadHandler = () => {
    const errorId = this.state.errorId;
    if (errorId) {
      this.props.services.errorService.commitError(errorId);
    }
  };

  componentDidMount() {
    if (typeof window !== 'undefined') {
      // Listen for page unload events (refresh, tab close, navigation away)
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  /**
   * Clean up event listeners when component unmounts
   */
  componentWillUnmount() {
    // Remove beforeunload event listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }

    // Commit the error when cleaning up
    const errorId = this.state.errorId;
    if (errorId) {
      this.props.services.errorService.commitError(errorId);
    }
  }

  /**
   * Render method must be implemented by extending classes
   */
  abstract render(): React.ReactNode;
}
