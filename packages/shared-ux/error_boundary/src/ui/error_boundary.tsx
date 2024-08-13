/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { KibanaErrorBoundaryServices } from '../../types';
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

interface ServiceContext {
  services: KibanaErrorBoundaryServices;
}

class ErrorBoundaryInternal extends React.Component<
  ErrorBoundaryProps & ServiceContext,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & ServiceContext) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      componentName: null,
      isFatal: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by Kibana React Error Boundary'); // eslint-disable-line no-console
    console.error(error); // eslint-disable-line no-console

    const { name, isFatal } = this.props.services.errorService.registerError(error, errorInfo);
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
            onClickRefresh={this.props.services.onClickRefresh}
          />
        );
      } else {
        return (
          <RecoverablePrompt
            error={error}
            errorInfo={errorInfo}
            name={componentName}
            onClickRefresh={this.props.services.onClickRefresh}
          />
        );
      }
    }

    // not in error state
    return this.props.children;
  }
}

/**
 * Implementation of Kibana Error Boundary
 * @param {ErrorBoundaryProps} props - ErrorBoundaryProps
 * @public
 */
export const KibanaErrorBoundary = (props: ErrorBoundaryProps) => {
  const services = useErrorBoundary();
  return <ErrorBoundaryInternal {...props} services={services} />;
};
