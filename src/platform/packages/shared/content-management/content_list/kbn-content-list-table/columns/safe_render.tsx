/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { EuiIconTip } from '@elastic/eui';

/**
 * Props for the {@link SafeRender} component.
 */
export interface SafeRenderProps {
  /** The render function to safely execute. */
  children: () => ReactNode;
  /** Optional column key for error identification. */
  columnKey?: string;
}

interface SafeRenderState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component that catches render errors in custom column renderers.
 *
 * Prevents a single column's render error from crashing the entire table.
 *
 * @example
 * ```tsx
 * <SafeRender columnKey="status">
 *   {() => customRenderer(item)}
 * </SafeRender>
 * ```
 */
export class SafeRender extends Component<SafeRenderProps, SafeRenderState> {
  constructor(props: SafeRenderProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SafeRenderState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    const { columnKey } = this.props;
    // Log error for debugging without crashing the table.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(
        `[ContentListTable] Render error in column "${columnKey ?? 'unknown'}":`,
        error
      );
    }
  }

  render(): React.ReactNode {
    const { children, columnKey } = this.props;
    const { hasError, error } = this.state;

    if (hasError) {
      const errorMessage = error?.message ?? 'Unknown error';
      return (
        <span data-test-subj="content-list-table-render-error">
          <EuiIconTip
            type="warning"
            color="danger"
            content={`Error rendering column${columnKey ? ` "${columnKey}"` : ''}: ${errorMessage}`}
          />
        </span>
      );
    }

    // Try/catch is needed for synchronous errors from the render prop since
    // error boundaries only catch errors in child component renders, not in
    // their own render method. The error boundary lifecycle catches errors
    // from React child component renders.
    try {
      return children();
    } catch (renderError) {
      // Handle synchronous render errors with consistent UI.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error(
          `[ContentListTable] Render error in column "${columnKey ?? 'unknown'}":`,
          renderError instanceof Error ? renderError : new Error(String(renderError))
        );
      }
      const errorMessage = renderError instanceof Error ? renderError.message : String(renderError);
      return (
        <span data-test-subj="content-list-table-render-error">
          <EuiIconTip
            type="warning"
            color="danger"
            content={`Error rendering column${columnKey ? ` "${columnKey}"` : ''}: ${errorMessage}`}
          />
        </span>
      );
    }
  }
}

/**
 * Functional wrapper for {@link SafeRender} that creates a safe render function.
 *
 * Use this to wrap custom column render functions.
 *
 * @template T - The item type passed to the render function.
 * @param render - The original render function.
 * @param columnKey - Optional column key for error identification.
 * @returns A wrapped render function that catches errors.
 */
export const createSafeRender = <T,>(
  render: (item: T) => ReactNode,
  columnKey?: string
): ((item: T) => ReactNode) => {
  return (item: T) => <SafeRender columnKey={columnKey}>{() => render(item)}</SafeRender>;
};
