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
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionListItem } from './workflow_execution_list_item';

jest.mock('../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced', () => ({
  FormattedRelativeEnhanced: ({ value }: { value: Date }) => <span>{value.toISOString()}</span>,
}));

jest.mock('../../../shared/ui/use_formatted_date', () => ({
  useGetFormattedDateTime: () => (date: Date) => date.toISOString(),
}));

const defaultProps = {
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: new Date('2026-01-01T00:00:00Z'),
  duration: 1000,
  executedBy: 'tal',
  triggeredBy: 'manual',
};

describe('WorkflowExecutionListItem', () => {
  describe('showExecutor feature flag', () => {
    it('should not render executor when showExecutor is false (default)', () => {
      render(<WorkflowExecutionListItem {...defaultProps} />);

      expect(screen.queryByText('tal')).not.toBeInTheDocument();
    });

    it('should not render executor when showExecutor is explicitly false', () => {
      render(<WorkflowExecutionListItem {...defaultProps} showExecutor={false} />);

      expect(screen.queryByText('tal')).not.toBeInTheDocument();
    });

    it('should render executor when showExecutor is true', () => {
      render(<WorkflowExecutionListItem {...defaultProps} showExecutor={true} />);

      expect(screen.getByText('tal')).toBeInTheDocument();
    });

    it('should not render executor when showExecutor is true but executedBy is undefined', () => {
      render(
        <WorkflowExecutionListItem {...defaultProps} executedBy={undefined} showExecutor={true} />
      );

      expect(screen.queryByText('tal')).not.toBeInTheDocument();
    });
  });
});
