/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionFlyoutTitle } from './execution_flyout_title';
import { getTestProvider } from '../../../shared/mocks/test_providers';

const renderTitle = (runName?: string) =>
  render(
    <ExecutionFlyoutTitle
      workflowName="Deploy service"
      runName={runName}
      startedAtIso={undefined}
    />,
    { wrapper: getTestProvider({}) }
  );

describe('ExecutionFlyoutTitle', () => {
  it('uses the execution name as the title and shows the workflow name below it', () => {
    renderTitle('Deploy staging');

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Deploy staging');
    expect(screen.getByText('Deploy service')).toBeInTheDocument();
  });

  it('uses the workflow name as the title for unnamed runs', () => {
    renderTitle();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Deploy service');
    expect(screen.getAllByText('Deploy service')).toHaveLength(1);
  });
});
