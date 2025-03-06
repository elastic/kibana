/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apm } from '@elastic/apm-rum';
import React from 'react';

import { mutateError } from '../../lib';
import type { KibanaErrorBoundaryServices } from '../../types';
import { useErrorBoundary } from '../services';
import { FatalPrompt, RecoverablePrompt } from './message_components';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
  componentName: null | string;
  isFatal: null | boolean;
}

interface ServiceContext {
  services: KibanaErrorBoundaryServices;
}

class ErrorBoundaryInternal extends React.Component<
  React.PropsWithChildren<ServiceContext>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<ServiceContext>) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      componentName: null,
      isFatal: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const customError = mutateError(error);
    apm.captureError(customError);
    console.error('Error caught by Kibana React Error Boundary'); // eslint-disable-line no-console
    console.error(customError); // eslint-disable-line no-console

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
        return <RecoverablePrompt onClickRefresh={this.props.services.onClickRefresh} />;
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
export const KibanaErrorBoundary = (props: React.PropsWithChildren<{}>) => {
  const services = useErrorBoundary();
  return <ErrorBoundaryInternal {...props} services={services} />;
};
