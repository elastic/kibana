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
import { WorkflowExecutionsTableResultCount } from './workflow_executions_table_result_count';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';

describe('WorkflowExecutionsTableResultCount', () => {
  it('shows an exact count when totalHits is within the result window', () => {
    render(
      <WorkflowExecutionsTableResultCount
        pageIndex={0}
        pageSize={25}
        pageItemCount={25}
        totalHits={8432}
      />
    );

    expect(screen.getByTestId('executionsTableResultCount')).toHaveTextContent(
      'Showing 1–25 of 8,432 executions'
    );
    expect(screen.queryByTestId('executionsTableLimitTip')).not.toBeInTheDocument();
  });

  it('shows a capped count and tip when totalHits exceeds the result window', () => {
    render(
      <WorkflowExecutionsTableResultCount
        pageIndex={0}
        pageSize={25}
        pageItemCount={25}
        totalHits={WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW + 500}
      />
    );

    expect(screen.getByTestId('executionsTableResultCount')).toHaveTextContent(
      'Showing 1–25 of 10,000+ executions'
    );
    expect(screen.getByTestId('executionsTableLimitTip')).toBeInTheDocument();
  });

  it('updates the visible range for later pages', () => {
    render(
      <WorkflowExecutionsTableResultCount
        pageIndex={1}
        pageSize={50}
        pageItemCount={50}
        totalHits={8432}
      />
    );

    expect(screen.getByTestId('executionsTableResultCount')).toHaveTextContent(
      'Showing 51–100 of 8,432 executions'
    );
  });
});
