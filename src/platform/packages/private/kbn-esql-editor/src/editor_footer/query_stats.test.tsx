/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ESQLQueryStats } from './query_stats';
import type { ESQLQueryStats as ESQLQueryStatsType } from '@kbn/esql-types';

describe('ESQLQueryStats', () => {
  it('should render query duration when provided', () => {
    const queryStats: ESQLQueryStatsType = {
      durationInMs: '150ms',
      totalDocumentsProcessed: undefined,
    };

    render(<ESQLQueryStats queryStats={queryStats} />);

    const durationElement = screen.getByTestId('ESQLEditor-queryStats-queryDuration');
    expect(durationElement).toBeInTheDocument();
    expect(durationElement).toHaveTextContent('150ms');
  });

  it('keeps the duration as text until a click handler is provided', () => {
    render(
      <ESQLQueryStats
        queryStats={{
          durationInMs: '150ms',
          totalDocumentsProcessed: undefined,
        }}
      />
    );

    expect(screen.queryByRole('button', { name: /open query profile/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('ESQLEditor-queryStats-queryDuration')).toHaveTextContent('150ms');
  });

  it('opens the query profile from the duration', () => {
    const onDurationClick = jest.fn();
    render(
      <ESQLQueryStats
        queryStats={{
          durationInMs: '150ms',
          totalDocumentsProcessed: undefined,
        }}
        onDurationClick={onDurationClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '150ms, open query profile' }));
    expect(onDurationClick).toHaveBeenCalled();
  });

  it('should render total documents processed when provided', () => {
    const queryStats: ESQLQueryStatsType = {
      durationInMs: undefined,
      totalDocumentsProcessed: 5000,
    };

    render(<ESQLQueryStats queryStats={queryStats} />);

    const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
    expect(documentsElement).toBeInTheDocument();
    expect(documentsElement).toHaveTextContent('5K documents processed');
  });

  it('should render both duration and documents processed when both are provided', () => {
    const queryStats: ESQLQueryStatsType = {
      durationInMs: '250ms',
      totalDocumentsProcessed: 1500000,
    };

    render(<ESQLQueryStats queryStats={queryStats} />);

    const durationElement = screen.getByTestId('ESQLEditor-queryStats-queryDuration');
    expect(durationElement).toBeInTheDocument();
    expect(durationElement).toHaveTextContent('250ms');

    const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
    expect(documentsElement).toBeInTheDocument();
    expect(documentsElement).toHaveTextContent('| 1.5M documents processed');
  });

  it('should not render duration when not provided', () => {
    const queryStats: ESQLQueryStatsType = {
      durationInMs: undefined,
      totalDocumentsProcessed: 1000,
    };

    render(<ESQLQueryStats queryStats={queryStats} />);

    expect(screen.queryByTestId('ESQLEditor-queryStats-queryDuration')).not.toBeInTheDocument();
  });

  it('should not render documents processed when not provided', () => {
    const queryStats: ESQLQueryStatsType = {
      durationInMs: '100ms',
      totalDocumentsProcessed: undefined,
    };

    render(<ESQLQueryStats queryStats={queryStats} />);

    expect(
      screen.queryByTestId('ESQLEditor-queryStats-totalDocumentsProcessed')
    ).not.toBeInTheDocument();
  });

  describe('document count formatting', () => {
    it('should format counts in billions', () => {
      const queryStats: ESQLQueryStatsType = {
        totalDocumentsProcessed: 2500000000,
      };

      render(<ESQLQueryStats queryStats={queryStats} />);

      const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
      expect(documentsElement).toHaveTextContent('2.5B documents processed');
    });

    it('should format counts in millions', () => {
      const queryStats: ESQLQueryStatsType = {
        totalDocumentsProcessed: 3200000,
      };

      render(<ESQLQueryStats queryStats={queryStats} />);

      const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
      expect(documentsElement).toHaveTextContent('3.2M documents processed');
    });

    it('should format counts in thousands', () => {
      const queryStats: ESQLQueryStatsType = {
        totalDocumentsProcessed: 4500,
      };

      render(<ESQLQueryStats queryStats={queryStats} />);

      const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
      expect(documentsElement).toHaveTextContent('4.5K documents processed');
    });

    it('should display counts below 1000 as is', () => {
      const queryStats: ESQLQueryStatsType = {
        totalDocumentsProcessed: 999,
      };

      render(<ESQLQueryStats queryStats={queryStats} />);

      const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
      expect(documentsElement).toHaveTextContent('999 documents processed');
    });

    it('should format whole numbers without decimal points', () => {
      const queryStats: ESQLQueryStatsType = {
        totalDocumentsProcessed: 2000000,
      };

      render(<ESQLQueryStats queryStats={queryStats} />);

      const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
      expect(documentsElement).toHaveTextContent('2M documents processed');
    });

    it('should include pipe when both duration and documents are present', () => {
      const queryStats: ESQLQueryStatsType = {
        durationInMs: '100ms',
        totalDocumentsProcessed: 5000,
      };

      render(<ESQLQueryStats queryStats={queryStats} />);

      const documentsElement = screen.getByTestId('ESQLEditor-queryStats-totalDocumentsProcessed');
      expect(documentsElement).toHaveTextContent('| 5K documents processed');
    });
  });
});
