/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import { EuiGlobalToastList, EuiGlobalToastListProps } from '@elastic/eui';

import { ErrorBoundaryServices } from '../types';
import { useErrorBoundary } from './error_boundary_services';
import { ErrorCallout, ErrorInline } from './toasts_service';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
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
  toasts?: EuiGlobalToastListProps['toasts'];
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
    super({ ...props, as: props.as === 'callout' ? props.as : 'toast' }); // set `as` to 'toast' if undefined
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: Partial<React.ErrorInfo>) {
    this.setState(() => {
      this.props.toastsService.addError(error);
      return { error, errorInfo };
    });
  }

  render() {
    if (this.state.error != null) {
      const { error, errorInfo } = this.state;
      this.props.errorService.onError(error); // capture telemetry

      const { errorComponentName } = this.props.errorService.getErrorComponentName(errorInfo);

      if (this.props.as === 'callout') {
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

      // display error message in a "less loud" container
      return (
        <>
          <ErrorInline
            error={error}
            errorInfo={errorInfo}
            name={errorComponentName}
            reloadWindow={this.props.reloadWindow}
          />
          {/* DOM ref for toasts list */}
          <EuiGlobalToastList
            toasts={this.props.toasts}
            dismissToast={() => {}}
            toastLifeTimeMs={9000}
          />
        </>
      );
    }

    // not in error state
    return this.props.children;
  }
}

export const ErrorBoundary = (props: ErrorBoundaryProps) => {
  const services = useErrorBoundary();
  const toasts = useObservable(services.toastsService.toasts);
  return <ErrorBoundaryInternal {...props} {...services} toasts={toasts} />;
};
