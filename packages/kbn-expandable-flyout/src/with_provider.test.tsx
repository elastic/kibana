/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import { useExpandableFlyoutApi } from './hooks/use_expandable_flyout_api';
import React from 'react';
import { withExpandableFlyoutProvider } from './with_provider';

const TestComponent = () => {
  useExpandableFlyoutApi();

  return <div data-test-subj="test-comp" />;
};

describe('withExpandableFlyoutProvider', () => {
  it('should throw when rendered without Expandable Provider', () => {
    expect(() => render(<TestComponent />)).toThrow();
  });

  it('should not throw when rendered with Expandable Provider', () => {
    const TestComponentWithProvider = withExpandableFlyoutProvider(TestComponent);
    expect(() => render(<TestComponentWithProvider />)).not.toThrow();
  });
});
