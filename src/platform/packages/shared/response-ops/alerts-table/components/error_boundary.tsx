/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export type FallbackComponent = React.ComponentType<{ error: Error }>;

interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback: FallbackComponent;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * A local error boundary component with a configurable fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return {
      error,
    };
  }

  render() {
    if (this.state.error != null) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} />;
    }
    return this.props.children ?? null;
  }
}
