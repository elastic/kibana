/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { ErrorBoundaryServices } from '../../types';
import { useErrorBoundary } from '../services/error_boundary_services';
import { FatalPrompt, RecoverablePrompt } from './message_components';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
  componentName: null | string;
  isFatal: null | boolean;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

class ErrorBoundaryInternal extends React.Component<
  ErrorBoundaryProps & ErrorBoundaryServices,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & ErrorBoundaryServices) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      componentName: null,
      isFatal: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: Partial<React.ErrorInfo>) {
    const { name, isFatal } = this.props.errorService.registerError(error, errorInfo);
    this.setState(() => {
      return { error, errorInfo, componentName: name, isFatal };
    });
  }

  render() {
    if (this.state.error != null) {
      const { error, errorInfo, componentName, isFatal } = this.state;

      if (isFatal) {
        return (
          <FatalPrompt
            error={error}
            errorInfo={errorInfo}
            name={componentName}
            reloadWindow={this.props.reloadWindow}
          />
        );
      } else {
        return (
          <RecoverablePrompt
            error={error}
            errorInfo={errorInfo}
            name={componentName}
            reloadWindow={this.props.reloadWindow}
          />
        );
      }
    }

    // not in error state
    return this.props.children;
  }
}

export const ErrorBoundary = (props: ErrorBoundaryProps) => {
  const services = useErrorBoundary();
  return <ErrorBoundaryInternal {...props} {...services} />;
};
