/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ErrorBoundary } from './error_boundary';

const FallbackComponent = () => <div>Fallback</div>;

const ComponentThatThrows = () => {
  throw new Error();
};

describe('ErrorBoundary', () => {
  it('should render its children when no error is thrown in its subtree', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={FallbackComponent}>
        <div>Children</div>
      </ErrorBoundary>
    );
    expect(getByText('Children')).toBeInTheDocument();
  });

  it('should display the provided fallback component when an error is thrown in its subtree', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={FallbackComponent}>
        <ComponentThatThrows />
      </ErrorBoundary>
    );
    expect(getByText('Fallback')).toBeInTheDocument();
  });
});
