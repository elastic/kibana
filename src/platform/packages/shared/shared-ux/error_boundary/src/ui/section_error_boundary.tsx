/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { apm } from '@elastic/apm-rum';

import { getErrorBoundaryLabels } from '../../lib';
import { useErrorBoundary } from '../services';
import { SectionFatalPrompt, SectionRecoverablePrompt } from './message_components';
import {
  BaseErrorBoundary,
  type BaseErrorBoundaryState,
  type BaseErrorBoundaryProps,
} from './base_error_boundary';

interface SectionErrorBoundaryProps {
  sectionName: string;
  /** How many times to retry remounting before showing error (default: 0, no retries) */
  maxRetries?: number;
}

interface SectionErrorBoundaryState extends BaseErrorBoundaryState {
  /** How many times we've retried */
  retryCount?: number;
}

/**
 * `KibanaSectionErrorBoundary` is designed to capture errors at a granular level.
 *
 * In general, it's best to use `KibanaErrorBoundary` and block the whole page.
 * Users will see an error state on the page and think that there are instabilities in the system.
 * They will be / should be wary about making any changes in a UI showing an error, since it risks
 * further instability.
 *
 * If it is acceptable to assume the risk of allowing users to interact with a UI that
 * has an error state, then using `KibanaSectionErrorBoundary` may be an acceptable alternative,
 * but this must be judged on a case-by-case basis.
 *
 * @example
 * ```tsx
 * <KibanaSectionErrorBoundary sectionName="Dashboard" maxRetries={3}>
 *   <MySection />
 * </KibanaSectionErrorBoundary>
 * ```
 */
export const KibanaSectionErrorBoundary = (
  props: React.PropsWithChildren<SectionErrorBoundaryProps>
) => {
  const services = useErrorBoundary();
  return <SectionErrorBoundaryInternal {...props} services={services} />;
};

class SectionErrorBoundaryInternal extends BaseErrorBoundary<
  React.PropsWithChildren<SectionErrorBoundaryProps> & BaseErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps & BaseErrorBoundaryProps) {
    super(props);

    this.state = {
      error: null,
      errorInfo: null,
      componentName: null,
      isFatal: null,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    apm.captureError(error, {
      labels: getErrorBoundaryLabels('SectionFatalReactError'),
    });
    console.error('Error caught by Kibana React Error Boundary'); // eslint-disable-line no-console
    console.error(error); // eslint-disable-line no-console

    // Enqueue the error instead of registering it immediately
    const enqueuedError = this.props.services.errorService.enqueueError(error, errorInfo);
    const { id: errorId, isFatal, name } = enqueuedError;

    this.setState((prevState) => {
      const nextRetryCount = (prevState.retryCount ?? 0) + 1;

      return {
        error,
        errorInfo,
        componentName: name,
        isFatal,
        errorId,
        retryCount: nextRetryCount,
      };
    });
  }

  render() {
    const { error, retryCount = 0 } = this.state;
    const { maxRetries = 0 } = this.props;
    const hasRetriesRemaining = retryCount <= maxRetries && error !== null;

    // If there are retries remaining, remount children with fresh state
    if (hasRetriesRemaining) {
      return <Fragment key={retryCount}>{this.props.children}</Fragment>;
    }

    // Once retries are exhausted or no error, show normal children or error prompt
    if (!error) {
      return this.props.children;
    }

    const { errorInfo, componentName, isFatal } = this.state;

    if (isFatal) {
      return (
        <SectionFatalPrompt
          sectionName={this.props.sectionName}
          error={error}
          errorInfo={errorInfo}
          name={componentName}
        />
      );
    }

    return (
      <SectionRecoverablePrompt
        sectionName={this.props.sectionName}
        onClickRefresh={this.props.services.onClickRefresh}
      />
    );
  }
}
