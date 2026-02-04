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
import type { MetricField } from '../../types';
import { OverviewTab } from './overview_tab';
import { ES_FIELD_TYPES } from '@kbn/field-types';

jest.mock('../../common/utils', () => ({
  getUnitLabel: jest.fn(({ unit }) => {
    const unitLabels: Record<string, string | undefined> = {
      ms: 'Milliseconds',
      bytes: 'Bytes',
      percent: 'Percent',
      count: undefined,
    };
    return unit ? unitLabels[unit] || unit : undefined;
  }),
}));

describe('Metric Flyout Overview Tab', () => {
  const createMockMetric = (overrides: Partial<MetricField> = {}): MetricField => ({
    name: 'test.metric',
    index: 'test-index',
    type: ES_FIELD_TYPES.DOUBLE,
    unit: 'ms',
    dimensions: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders the tab title and description', () => {
      const metric = createMockMetric();
      const { getByText, getByTestId } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('metricsExperienceFlyoutMetricName')).toBeInTheDocument();
      expect(getByText(metric.name)).toBeInTheDocument();
    });

    it('renders main description list', () => {
      const metric = createMockMetric({ index: 'my-data-stream', type: ES_FIELD_TYPES.LONG });
      const { getByTestId, getByText } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabDescriptionList')).toBeInTheDocument();
      expect(getByText('my-data-stream')).toBeInTheDocument();
      expect(getByText('long')).toBeInTheDocument();
    });
  });

  describe('unit display', () => {
    it('renders unit when present', () => {
      const metric = createMockMetric({ unit: 'ms' });
      const { getByTestId, getByText } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricUnitLabel')).toBeInTheDocument();
      expect(getByText('Milliseconds')).toBeInTheDocument();
    });

    it('does not render unit section when unit is undefined', () => {
      const metric = createMockMetric({ unit: undefined });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabMetricUnitLabel')
      ).not.toBeInTheDocument();
    });
  });

  describe('instrument display', () => {
    it('renders instrument when present', () => {
      const metric = createMockMetric({ instrument: 'counter' });
      const { getByTestId, getByText } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')).toBeInTheDocument();
      expect(getByText('counter')).toBeInTheDocument();
    });

    it('does not render instrument section when not present', () => {
      const metric = createMockMetric({ instrument: undefined });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')
      ).not.toBeInTheDocument();
    });

    it('handles different instrument types', () => {
      const instruments = ['counter', 'gauge', 'histogram'] as const;

      instruments.forEach((instrument) => {
        const metric = createMockMetric({ instrument });
        const { rerender, getByTestId, getByText } = render(<OverviewTab metric={metric} />);

        expect(
          getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')
        ).toBeInTheDocument();
        expect(getByText(instrument)).toBeInTheDocument();

        rerender(<div />); // Clear between tests
      });
    });
  });

  describe('dimensions handling', () => {
    it('does not render dimensions section when no dimensions', () => {
      const metric = createMockMetric({ dimensions: [] });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabDimensionsLabel')
      ).not.toBeInTheDocument();
      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabDimensionsList')
      ).not.toBeInTheDocument();
    });

    it('renders dimensions list when dimensions are present', () => {
      const dimensions = [
        { name: 'service.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'host.name', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'attributes.state', type: ES_FIELD_TYPES.KEYWORD },
      ];
      const metric = createMockMetric({ dimensions });
      const { getByTestId, getByText } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabDimensionsLabel')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceFlyoutOverviewTabDimensionsList')).toBeInTheDocument();

      // Check dimensions are sorted alphabetically
      expect(getByText('attributes.state')).toBeInTheDocument();
      expect(getByText('host.name')).toBeInTheDocument();
      expect(getByText('service.name')).toBeInTheDocument();
    });

    it('shows pagination when dimensions count is 20 or more', () => {
      const dimensions = Array.from({ length: 20 }, (_, i) => ({
        name: `dimension.${String(i).padStart(2, '0')}`,
        type: ES_FIELD_TYPES.KEYWORD,
      }));
      const metric = createMockMetric({ dimensions });
      const { getByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        getByTestId('metricsExperienceFlyoutOverviewTabDimensionsPagination')
      ).toBeInTheDocument();
    });

    it('does not show pagination when dimensions count is less than 20', () => {
      const dimensions = [
        { name: 'dimension.01', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'dimension.02', type: ES_FIELD_TYPES.KEYWORD },
      ];
      const metric = createMockMetric({ dimensions });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabDimensionsPagination')
      ).not.toBeInTheDocument();
    });

    it('keeps pagination visible when on last page with fewer items than page size', () => {
      const dimensions = Array.from({ length: 25 }, (_, i) => ({
        name: `dimension.${String(i).padStart(2, '0')}`,
        type: ES_FIELD_TYPES.KEYWORD,
      }));
      const metric = createMockMetric({ dimensions });
      const { getByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        getByTestId('metricsExperienceFlyoutOverviewTabDimensionsPagination')
      ).toBeInTheDocument();
    });

    it('sorts dimensions alphabetically', () => {
      const dimensions = [
        { name: 'zebra.field', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'alpha.field', type: ES_FIELD_TYPES.KEYWORD },
        { name: 'beta.field', type: ES_FIELD_TYPES.KEYWORD },
      ];
      const metric = createMockMetric({ dimensions });
      const { container } = render(<OverviewTab metric={metric} />);

      const listItems = container.querySelectorAll('li.euiListGroupItem');
      expect(listItems).toHaveLength(3);

      // Verify alphabetical order in rendered list
      expect(listItems[0]).toHaveTextContent('alpha.field');
      expect(listItems[1]).toHaveTextContent('beta.field');
      expect(listItems[2]).toHaveTextContent('zebra.field');
    });
  });

  describe('description display', () => {
    it('renders description when present', () => {
      const metric = createMockMetric();
      const { getByTestId, getByText } = render(
        <OverviewTab metric={metric} description="Test description" />
      );

      expect(getByTestId('metricsExperienceFlyoutMetricDescription')).toBeInTheDocument();
      expect(getByText('Test description')).toBeInTheDocument();
    });
  });
});
