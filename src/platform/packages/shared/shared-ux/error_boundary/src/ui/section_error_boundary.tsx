/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { KibanaErrorBoundaryServices } from '../../types';
import { useErrorBoundary } from '../services/error_boundary_services';
import { SectionErrorPrompt } from './message_components';

interface ErrorBoundaryState {
  error: null | Error;
  errorInfo: null | Partial<React.ErrorInfo>;
  componentName: null | string;
}

interface SectionErrorBoundaryProps {
  sectionName: string;
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
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by Kibana React Error Boundary'); // eslint-disable-line no-console
    console.error(error); // eslint-disable-line no-console

    const { name } = this.props.services.errorService.registerError(error, errorInfo);
    this.setState({ error, errorInfo, componentName: name });
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const { error, errorInfo, componentName } = this.state;

    return (
      <SectionErrorPrompt
        sectionName={this.props.sectionName}
        error={error}
        errorInfo={errorInfo}
        name={componentName}
      />
    );
  }
}

/**
 * Implementation of Kibana Error Boundary to catch errors in app sections.
 * A section represents a small chunk of UI where an error may happen.
 */
export const KibanaSectionErrorBoundary = (
  props: React.PropsWithChildren<SectionErrorBoundaryProps>
) => {
  const services = useErrorBoundary();
  return <SectionErrorBoundaryInternal {...props} services={services} />;
};
