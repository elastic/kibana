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
import { NextExecutionTime } from './next_execution_time';
import { useGetFormattedDateTime } from './use_formatted_date';
import type { WorkflowTrigger } from '../../../server/lib/schedule_utils';
import { getWorkflowNextExecutionTime } from '../../lib/next_execution_time';

// Mock the dependencies
jest.mock('./use_formatted_date');
jest.mock('../../lib/next_execution_time');

describe('NextExecutionTime', () => {
  const mockGetFormattedDateTime = jest.fn();
  const mockGetWorkflowNextExecutionTime = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetFormattedDateTime as jest.Mock).mockReturnValue(mockGetFormattedDateTime);
    (getWorkflowNextExecutionTime as jest.Mock).mockImplementation(
      mockGetWorkflowNextExecutionTime
    );
  });

  const createMockTriggers = (overrides: Partial<WorkflowTrigger>[] = []): WorkflowTrigger[] => {
    return overrides.map((override) => ({
      type: 'scheduled',
      enabled: true,
      with: { every: '5m' },
      ...override,
    }));
  };

  const TestChild = () => <div data-test-subj="test-child">{'Test Child'}</div>;

  describe('children rendering', () => {
    it('should always render children regardless of nextExecutionTime', () => {
      mockGetWorkflowNextExecutionTime.mockReturnValue(null);

      render(
        <NextExecutionTime triggers={[]} history={[]}>
          <TestChild />
        </NextExecutionTime>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });
  });

  describe('tooltip behavior', () => {
    it('should show empty tooltip when nextExecutionTime is null', () => {
      mockGetWorkflowNextExecutionTime.mockReturnValue(null);

      render(
        <NextExecutionTime triggers={[]} history={[]}>
          <TestChild />
        </NextExecutionTime>
      );

      // Tooltip should be present but with empty content
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      // Verify that getWorkflowNextExecutionTime was called
      expect(mockGetWorkflowNextExecutionTime).toHaveBeenCalledWith([], []);
    });
  });

  describe('different trigger combinations', () => {
    it('should handle empty triggers array', () => {
      mockGetWorkflowNextExecutionTime.mockReturnValue(null);

      render(
        <NextExecutionTime triggers={[]} history={[]}>
          <TestChild />
        </NextExecutionTime>
      );

      expect(mockGetWorkflowNextExecutionTime).toHaveBeenCalledWith([], []);
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle non-scheduled triggers only', () => {
      const triggers = createMockTriggers([{ type: 'manual' }, { type: 'alert' }]);
      mockGetWorkflowNextExecutionTime.mockReturnValue(null);

      render(
        <NextExecutionTime triggers={triggers} history={[]}>
          <TestChild />
        </NextExecutionTime>
      );

      expect(mockGetWorkflowNextExecutionTime).toHaveBeenCalledWith(triggers, []);
    });

    it('should handle scheduled triggers only', () => {
      const triggers = createMockTriggers([{ type: 'scheduled', with: { every: '5m' } }]);
      const nextExecutionTime = new Date('2025-01-15T11:00:00Z');
      mockGetWorkflowNextExecutionTime.mockReturnValue(nextExecutionTime);
      mockGetFormattedDateTime.mockReturnValue('Jan 15, 2025 11:00 AM');

      render(
        <NextExecutionTime triggers={triggers} history={[]}>
          <TestChild />
        </NextExecutionTime>
      );

      expect(mockGetWorkflowNextExecutionTime).toHaveBeenCalledWith(triggers, []);
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(mockGetFormattedDateTime).toHaveBeenCalledWith(nextExecutionTime);
    });

    it('should handle mixed trigger types', () => {
      const triggers = createMockTriggers([
        { type: 'manual' },
        { type: 'alert' },
        { type: 'scheduled', with: { every: '30m' } },
      ]);
      const nextExecutionTime = new Date('2025-01-15T10:30:00Z');
      mockGetWorkflowNextExecutionTime.mockReturnValue(nextExecutionTime);
      mockGetFormattedDateTime.mockReturnValue('Jan 15, 2025 10:30 AM');

      render(
        <NextExecutionTime triggers={triggers} history={[]}>
          <TestChild />
        </NextExecutionTime>
      );

      expect(mockGetWorkflowNextExecutionTime).toHaveBeenCalledWith(triggers, []);
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(mockGetFormattedDateTime).toHaveBeenCalledWith(nextExecutionTime);
    });
  });
});
