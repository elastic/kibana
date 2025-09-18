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
import type { Dimension, MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { OverviewTab } from './overview_tab';

jest.mock('./tab_title_and_description', () => ({
  TabTitleAndDescription: ({ metric }: { metric: MetricField }) => (
    <div data-test-subj="tab-title-description">Tab Title for {metric.name}</div>
  ),
}));

jest.mock('./dimension_badges', () => ({
  DimensionBadges: ({ dimensions }: { dimensions: Dimension[] }) => (
    <div data-test-subj="dimension-badges">
      {dimensions.map((dim, index) => (
        <span key={index} data-test-subj={`dimension-badge-${dim.name}`}>
          {dim.name}
        </span>
      ))}
    </div>
  ),
}));

jest.mock('../../common/utils/dimensions', () => ({
  categorizeDimensions: jest.fn((dimensions = []) => ({
    requiredDimensions: dimensions.filter((d: any) => d.required),
    optionalDimensions: dimensions.filter((d: any) => !d.required),
  })),
}));

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
    type: 'double',
    unit: 'ms',
    source: 'ecs',
    dimensions: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders the tab title and description', () => {
      const metric = createMockMetric();
      const { getByTestId } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('tab-title-description')).toBeInTheDocument();
      expect(getByTestId('tab-title-description')).toHaveTextContent('Tab Title for test.metric');
    });

    it('renders main description list', () => {
      const metric = createMockMetric({ index: 'my-data-stream', type: 'long' });
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

  describe('Otel metrics', () => {
    it('renders otel section when source is otel and stability exists', () => {
      const metric = createMockMetric({
        source: 'otel',
        stability: 'stable',
      });

      const { getByTestId, getByText } = render(<OverviewTab metric={metric} />);

      expect(
        getByTestId('metricsExperienceFlyoutOverviewTabOtelDescriptionList')
      ).toBeInTheDocument();
      expect(getByText('stable')).toBeInTheDocument();
    });

    it('renders stability badge for experimental metrics', () => {
      const metric = createMockMetric({
        source: 'otel',
        stability: 'experimental',
      });
      const { getByTestId, getByText } = render(<OverviewTab metric={metric} />);

      expect(
        getByTestId('metricsExperienceFlyoutOverviewTabOtelDescriptionList')
      ).toBeInTheDocument();
      expect(getByText('experimental')).toBeInTheDocument();
    });

    it('does not render Otel section when source is not Otel', () => {
      const metric = createMockMetric({
        source: 'ecs',
        stability: 'stable',
      });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabOtelDescriptionList')
      ).not.toBeInTheDocument();
    });

    it('does not render Otel section when stability is not present', () => {
      const metric = createMockMetric({
        source: 'otel',
        stability: undefined,
      });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabOtelDescriptionList')
      ).not.toBeInTheDocument();
    });
  });

  describe('dimensions handling', () => {
    it('does not render dimensions section when no dimensions', () => {
      const metric = createMockMetric({ dimensions: [] });
      const { queryByTestId } = render(<OverviewTab metric={metric} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabRequiredDimensionsLabel')
      ).not.toBeInTheDocument();
      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabAdditionalDimensionsLabel')
      ).not.toBeInTheDocument();
    });

    it('renders dimensions when present', () => {
      const dimensions = [
        { name: 'host.name', type: 'keyword' },
        { name: 'service.name', type: 'keyword' },
      ];
      const metric = createMockMetric({ dimensions });
      const { getByTestId } = render(<OverviewTab metric={metric} />);

      expect(getByTestId('dimension-badge-host.name')).toBeInTheDocument();
      expect(getByTestId('dimension-badge-service.name')).toBeInTheDocument();
    });
  });
});
