/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { WorkflowDetailLoadingState } from './workflow_detail_loading_state';

describe('WorkflowDetailLoadingState', () => {
  it('should render a progress bar', () => {
    const { container } = render(<WorkflowDetailLoadingState />);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render skeleton text placeholders', () => {
    const { container } = render(<WorkflowDetailLoadingState />);

    // The component renders 4 EuiSkeletonText blocks
    const skeletonElements = container.querySelectorAll('.euiSkeletonText');
    expect(skeletonElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should render without crashing', () => {
    expect(() => render(<WorkflowDetailLoadingState />)).not.toThrow();
  });
});
