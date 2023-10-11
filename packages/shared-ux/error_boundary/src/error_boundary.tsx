/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiGlobalToastList,
  EuiGlobalToastListProps,
  EuiPanel,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { ErrorBoundaryServices } from '../types';
import { useErrorBoundary } from './services';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
}

interface ErrorCalloutProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  reloadWindow: () => void;
}

// move out
const ErrorCallout = (props: ErrorCalloutProps) => {
  const { error, errorInfo, name: errorComponentName, reloadWindow } = props;
  const errorBoundaryAccordionId = useGeneratedHtmlId({ prefix: 'errorBoundaryAccordion' });
  return (
    <EuiCallOut title="A fatal error was encountered" color="danger" iconType="error">
      <p>Try refreshing this page.</p>
      <EuiAccordion id={errorBoundaryAccordionId} buttonContent="Show detail">
        <EuiPanel paddingSize="m">
          <EuiCodeBlock>
            {errorComponentName && (
              <p>
                An error occurred in <EuiCode>{errorComponentName}</EuiCode>
              </p>
            )}
            {error?.message && <p>{error.message}</p>}
            {errorInfo?.componentStack}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiAccordion>
      <EuiSpacer />
      <p>
        <EuiButton color="danger" fill={true} onClick={reloadWindow}>
          Refresh
        </EuiButton>
      </p>
    </EuiCallOut>
  );
};

// move out
const ErrorInline = (_props: ErrorCalloutProps) => {
  return <EuiCallOut color="danger" iconType="error" title="Error: unable to load." />;
};

// keep
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
