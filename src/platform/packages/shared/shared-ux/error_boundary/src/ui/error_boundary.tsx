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

import { getErrorBoundaryLabels } from '../../lib';
import { useErrorBoundary } from '../services';
import { FatalPrompt, RecoverablePrompt } from './message_components';
import {
  BaseErrorBoundary,
  type BaseErrorBoundaryState,
  type BaseErrorBoundaryProps,
} from './base_error_boundary';

class ErrorBoundaryInternal extends BaseErrorBoundary<
  React.PropsWithChildren<BaseErrorBoundaryProps>,
  BaseErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<BaseErrorBoundaryProps>) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      componentName: null,
      isFatal: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    apm.captureError(error, {
      labels: getErrorBoundaryLabels('PageFatalReactError'),
    });
    console.error('Error caught by Kibana React Error Boundary'); // eslint-disable-line no-console
    console.error(error); // eslint-disable-line no-console

    // Enqueue the error instead of registering it immediately
    const enqueuedError = this.props.services.errorService.enqueueError(error, errorInfo);
    const { id: errorId, isFatal, name } = enqueuedError;

    this.setState({
      error,
      errorInfo,
      componentName: name,
      isFatal,
      errorId,
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
