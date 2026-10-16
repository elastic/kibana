/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut } from '@elastic/eui';
import React, { Component, type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';

interface GraphErrorBoundaryState {
  error: Error | null;
}

export class GraphErrorBoundary extends Component<
  {
    children: ReactNode;
    /** Clears a caught error when any entry changes identity (e.g. the workflow was edited). */
    resetKeys: readonly unknown[];
    onError?: (msg: string) => void;
  },
  GraphErrorBoundaryState
> {
  state: GraphErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GraphErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: { resetKeys: readonly unknown[] }) {
    const { resetKeys } = this.props;
    if (
      this.state.error &&
      (resetKeys.length !== prevProps.resetKeys.length ||
        resetKeys.some((key, index) => !Object.is(key, prevProps.resetKeys[index])))
    ) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.error) {
      return (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('workflowsUi.graph.renderErrorTitle', {
            defaultMessage: 'Workflow graph could not be displayed',
          })}
          color="danger"
          iconType="error"
        >
          <p>{this.state.error.message}</p>
        </EuiCallOut>
      );
    }
    return this.props.children;
  }
}
