/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import { ErrorBoundaryServices, Toasts } from '../../types';
import { useErrorBoundary } from '../services/error_boundary_services';
import { FatalInline, FatalPrompt, RecoverableInline, RecoverablePrompt } from './error_messages';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
  messageAs: 'callout' | 'toast';
  componentName: null | string;
  isFatal: null | boolean;
}

interface ErrorBoundaryProps {
  /**
   * Consumers may control how error message is presented: either as a toast message or a callout. Default is a
   * toast message.
   */
  as?: 'callout' | 'toast';
  /**
   * List of toasts to pass to the EuiGlobalToastList
   */
  toasts?: Toasts;
  /**
   *
   */
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
      messageAs: props.as === 'callout' ? props.as : 'toast',
      componentName: null,
      isFatal: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: Partial<React.ErrorInfo>) {
    const { name, isFatal } = this.props.errorService.registerError(error, errorInfo);
    this.setState(() => {
      if (this.state.messageAs === 'toast') {
        this.props.toastsService.addError(error, isFatal);
      }
      return { error, errorInfo, componentName: name, isFatal };
    });
  }

  render() {
    if (this.state.error != null) {
      const { error, errorInfo, componentName, isFatal } = this.state;

      if (isFatal) {
        switch (this.state.messageAs) {
          case 'toast':
            return (
              <FatalInline
                error={error}
                errorInfo={errorInfo}
                name={componentName}
                reloadWindow={this.props.reloadWindow}
              />
            );
          default:
            return (
              <FatalPrompt
                error={error}
                errorInfo={errorInfo}
                name={componentName}
                reloadWindow={this.props.reloadWindow}
              />
            );
        }
      } else {
        switch (this.state.messageAs) {
          case 'toast':
            return (
              <RecoverableInline
                error={error}
                errorInfo={errorInfo}
                name={componentName}
                reloadWindow={this.props.reloadWindow}
              />
            );
          default:
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
    }

    // not in error state
    return this.props.children;
  }
}

export const ErrorBoundary = (props: ErrorBoundaryProps) => {
  const services = useErrorBoundary();
  const toasts = useObservable(services.toastsService.toasts$);
  return <ErrorBoundaryInternal {...props} {...services} toasts={toasts} />;
};
