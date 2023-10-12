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
import { ErrorCallout } from './error_messages';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
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
    };
  }

  componentDidCatch(error: Error, errorInfo: Partial<React.ErrorInfo>) {
    this.props.errorService.onError(error);
    this.setState(() => {
      return { error, errorInfo };
    });
  }

  render() {
    if (this.state.error != null) {
      const { error, errorInfo } = this.state;
      const { errorComponentName } = this.props.errorService.getErrorComponentName(errorInfo);

      // display error message in a "loud" container
      return (
        <ErrorCallout
          error={error}
          errorInfo={errorInfo}
          name={errorComponentName}
          reloadWindow={this.props.reloadWindow}
        />
      );
    }

    // not in error state
    return this.props.children;
  }
}

export const ErrorBoundary = (props: ErrorBoundaryProps) => {
  const services = useErrorBoundary();
  return <ErrorBoundaryInternal {...props} {...services} />;
};
