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
import { WorkflowExecutionStatsBar } from './workflow_executions_stats_bar';

// Mock useWorkflowStats
const mockUseWorkflowStats = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_stats', () => ({
  useWorkflowStats: () => mockUseWorkflowStats(),
}));

// Mock @elastic/charts to avoid rendering issues in tests
jest.mock('@elastic/charts', () => ({
  Chart: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="mock-chart">{children}</div>
  ),
  Axis: ({ id, title }: { id: string; title: string }) => (
    <div data-test-subj={`mock-axis-${id}`}>{title}</div>
  ),
  BarSeries: ({ id }: { id: string }) => <div data-test-subj={`mock-bar-series-${id}`} />,
  Settings: () => <div data-test-subj="mock-settings" />,
  Tooltip: () => <div data-test-subj="mock-tooltip" />,
  niceTimeFormatter: () => jest.fn(),
  Position: {
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
  ScaleType: {
    Time: 'time',
    Linear: 'linear',
  },
}));

jest.mock('@elastic/charts/dist/utils/data/formatters', () => ({
  timeFormatter: () => jest.fn(),
}));

describe('WorkflowExecutionStatsBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a placeholder when data is loading', () => {
    mockUseWorkflowStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<WorkflowExecutionStatsBar />);

    // Should not render the chart when loading
    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
    // Should render something (the placeholder)
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a placeholder when data is undefined', () => {
    mockUseWorkflowStats.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { container } = render(<WorkflowExecutionStatsBar />);

    expect(screen.queryByTestId('mock-chart')).not.toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('renders null when executions array is empty', () => {
    mockUseWorkflowStats.mockReturnValue({
      data: { executions: [] },
      isLoading: false,
    });

    const { container } = render(<WorkflowExecutionStatsBar />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders chart with execution data', () => {
    mockUseWorkflowStats.mockReturnValue({
      data: {
        executions: [
          {
            timestamp: 1711267200000,
            completed: 5,
            failed: 2,
            cancelled: 1,
          },
          {
            timestamp: 1711353600000,
            completed: 3,
            failed: 0,
            cancelled: 0,
          },
        ],
      },
      isLoading: false,
    });

    render(<WorkflowExecutionStatsBar />);

    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    expect(screen.getByTestId('mock-bar-series-workflows-executions-stats')).toBeInTheDocument();
    expect(screen.getByTestId('mock-axis-bottom-axis')).toBeInTheDocument();
    expect(screen.getByTestId('mock-axis-left-axis')).toBeInTheDocument();
  });

  it('renders chart axes with correct titles', () => {
    mockUseWorkflowStats.mockReturnValue({
      data: {
        executions: [
          {
            timestamp: 1711267200000,
            completed: 1,
            failed: 0,
            cancelled: 0,
          },
        ],
      },
      isLoading: false,
    });

    render(<WorkflowExecutionStatsBar />);

    expect(screen.getByText('@timestamp')).toBeInTheDocument();
    expect(screen.getByText('Executions')).toBeInTheDocument();
  });

  it('accepts an optional height prop', () => {
    mockUseWorkflowStats.mockReturnValue({
      data: {
        executions: [
          {
            timestamp: 1711267200000,
            completed: 1,
            failed: 0,
            cancelled: 0,
          },
        ],
      },
      isLoading: false,
    });

    render(<WorkflowExecutionStatsBar height={300} />);

    expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
  });
});
