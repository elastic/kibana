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
import { SectionFatalPrompt, SectionRecoverablePrompt } from './message_components';

interface SectionErrorBoundaryProps {
  sectionName: string;
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
 */
export const KibanaSectionErrorBoundary = (
  props: React.PropsWithChildren<SectionErrorBoundaryProps>
) => {
  const services = useErrorBoundary();
  return <SectionErrorBoundaryInternal {...props} services={services} />;
};

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
  componentName: null | string;
  isFatal: null | boolean;
}

interface ServiceContext {
  services: KibanaErrorBoundaryServices;
}

class SectionErrorBoundaryInternal extends React.Component<
  React.PropsWithChildren<SectionErrorBoundaryProps> & ServiceContext,
  ErrorBoundaryState
> {
  constructor(props: SectionErrorBoundaryProps & ServiceContext) {
    super(props);

    this.state = {
      error: null,
      errorInfo: null,
      componentName: null,
      isFatal: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const customError = mutateError(error);
    apm.captureError(customError);
    console.error('Error caught by Kibana React Error Boundary'); // eslint-disable-line no-console
    console.error(customError); // eslint-disable-line no-console

    const { name, isFatal } = this.props.services.errorService.registerError(error, errorInfo);
    this.setState({ error, errorInfo, componentName: name, isFatal });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const { error, errorInfo, componentName, isFatal } = this.state;

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
