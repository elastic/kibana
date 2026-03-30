/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ParsedMetricItem } from '../../../types';
import { OverviewTab } from './overview_tab';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { METRIC_TYPE_DESCRIPTIONS } from '../components';

jest.mock('../../../common/utils', () => ({
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
  const createMockMetric = (overrides: Partial<ParsedMetricItem> = {}): ParsedMetricItem => ({
    metricName: 'test.metric',
    dataStream: 'test-data-stream',
    fieldTypes: [ES_FIELD_TYPES.DOUBLE],
    units: ['ms'],
    dimensionFields: [],
    metricTypes: ['counter'],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders the tab title and description', () => {
      const metricItem = createMockMetric();
      const { getByText, getByTestId } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutMetricName')).toBeInTheDocument();
      expect(getByText(metricItem.metricName)).toBeInTheDocument();
    });

    it('renders main description list', () => {
      const metricItem = createMockMetric({
        dataStream: 'my-data-stream',
        fieldTypes: [ES_FIELD_TYPES.LONG],
      });
      const { getByTestId, getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabDescriptionList')).toBeInTheDocument();
      expect(getByText('my-data-stream')).toBeInTheDocument();
      expect(getByText('long')).toBeInTheDocument();
    });
  });

  describe('unit display', () => {
    it('renders unit when present', () => {
      const metricItem = createMockMetric({ units: ['ms'] });
      const { getByTestId, getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricUnitLabel')).toBeInTheDocument();
      expect(getByText('Milliseconds')).toBeInTheDocument();
    });

    it('renders NoValueBadge when units are empty', () => {
      const metricItem = createMockMetric({ units: [] });
      const { getByTestId, getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricUnitLabel')).toBeInTheDocument();
      expect(getByText('No value')).toBeInTheDocument();
    });
  });

  describe('instrument display', () => {
    it('renders instrument when present', () => {
      const metricItem = createMockMetric({ metricTypes: ['counter'] });
      const { getByTestId, getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')).toBeInTheDocument();
      expect(getByText('counter')).toBeInTheDocument();
    });

    it('renders NoValueBadge when metricTypes is undefined', () => {
      const metricItem = createMockMetric({ metricTypes: undefined });
      const { getByTestId, getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')).toBeInTheDocument();
      expect(getByText('No value')).toBeInTheDocument();
    });

    it('handles different instrument types', () => {
      const instruments = ['counter', 'gauge', 'histogram'] as const;

      instruments.forEach((instrument) => {
        const metricItem = createMockMetric({ metricTypes: [instrument] });
        const { rerender, getByTestId, getByText } = render(
          <OverviewTab metricItem={metricItem} />
        );

        expect(
          getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')
        ).toBeInTheDocument();
        expect(getByText(instrument)).toBeInTheDocument();

        rerender(<div />); // Clear between tests
      });
    });

    it.each(['gauge', 'counter', 'histogram'] as const)(
      'shows tooltip with description when hovering over %s badge',
      async (instrument) => {
        const metricItem = createMockMetric({ metricTypes: [instrument] });
        render(<OverviewTab metricItem={metricItem} />);

        const badge = screen.getByText(instrument);
        await userEvent.hover(badge);

        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toHaveTextContent(
            METRIC_TYPE_DESCRIPTIONS[instrument]!
          );
        });
      }
    );

    it('does not show tooltip for unknown instrument type', async () => {
      const metricItem = createMockMetric({ metricTypes: ['position'] });
      render(<OverviewTab metricItem={metricItem} />);

      const badge = screen.getByText('position');
      await userEvent.hover(badge);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('dimensions handling', () => {
    it('does not render dimensions section when no dimensions', () => {
      const metricItem = createMockMetric({ dimensionFields: [] });
      const { queryByTestId } = render(<OverviewTab metricItem={metricItem} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabDimensionsLabel')
      ).not.toBeInTheDocument();
      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabDimensionsList')
      ).not.toBeInTheDocument();
    });

    it('renders dimensions list when dimensions are present', () => {
      const dimensionFields = [
        { name: 'service.name' },
        { name: 'host.name' },
        { name: 'attributes.state' },
      ];
      const metricItem = createMockMetric({ dimensionFields });
      const { getByTestId, getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabDimensionsLabel')).toBeInTheDocument();
      expect(getByTestId('metricsExperienceFlyoutOverviewTabDimensionsList')).toBeInTheDocument();

      // Check dimensions are sorted alphabetically
      expect(getByText('attributes.state')).toBeInTheDocument();
      expect(getByText('host.name')).toBeInTheDocument();
      expect(getByText('service.name')).toBeInTheDocument();
    });

    it('shows pagination when dimensions count is 20 or more', () => {
      const dimensionFields = Array.from({ length: 20 }, (_, i) => ({
        name: `dimension.${String(i).padStart(2, '0')}`,
      }));
      const metricItem = createMockMetric({ dimensionFields });
      const { getByTestId } = render(<OverviewTab metricItem={metricItem} />);

      expect(
        getByTestId('metricsExperienceFlyoutOverviewTabDimensionsPagination')
      ).toBeInTheDocument();
    });

    it('does not show pagination when dimensions count is less than 20', () => {
      const dimensionFields = [{ name: 'dimension.01' }, { name: 'dimension.02' }];
      const metricItem = createMockMetric({ dimensionFields });
      const { queryByTestId } = render(<OverviewTab metricItem={metricItem} />);

      expect(
        queryByTestId('metricsExperienceFlyoutOverviewTabDimensionsPagination')
      ).not.toBeInTheDocument();
    });

    it('keeps pagination visible when on last page with fewer items than page size', () => {
      const dimensionFields = Array.from({ length: 25 }, (_, i) => ({
        name: `dimension.${String(i).padStart(2, '0')}`,
      }));
      const metricItem = createMockMetric({ dimensionFields });
      const { getByTestId } = render(<OverviewTab metricItem={metricItem} />);

      expect(
        getByTestId('metricsExperienceFlyoutOverviewTabDimensionsPagination')
      ).toBeInTheDocument();
    });

    it('sorts dimensions alphabetically', () => {
      const dimensionFields = [
        { name: 'zebra.field' },
        { name: 'alpha.field' },
        { name: 'beta.field' },
      ];
      const metricItem = createMockMetric({ dimensionFields });
      const { container } = render(<OverviewTab metricItem={metricItem} />);

      const dimensionsList = container.querySelector(
        '[data-test-subj="metricsExperienceFlyoutOverviewTabDimensionsList"]'
      );
      expect(dimensionsList).toBeInTheDocument();

      const listItems = dimensionsList?.querySelectorAll('li.euiListGroupItem') || [];
      expect(listItems).toHaveLength(3);

      // Verify alphabetical order in rendered list
      expect(listItems[0]).toHaveTextContent('alpha.field');
      expect(listItems[1]).toHaveTextContent('beta.field');
      expect(listItems[2]).toHaveTextContent('zebra.field');
    });
  });

  describe('multiple values display', () => {
    it('renders multiple field types as badges', () => {
      const metricItem = createMockMetric({
        fieldTypes: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
      });
      const { getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByText('double')).toBeInTheDocument();
      expect(getByText('long')).toBeInTheDocument();
    });

    it('renders multiple units as badges', () => {
      const metricItem = createMockMetric({ units: ['ms', 'bytes'] });
      const { getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByText('Milliseconds')).toBeInTheDocument();
      expect(getByText('Bytes')).toBeInTheDocument();
    });

    it('renders null field type as NoValueBadge', () => {
      const metricItem = createMockMetric({
        fieldTypes: [ES_FIELD_TYPES.NULL],
      });
      const { getByText, queryByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByText('No value')).toBeInTheDocument();
      expect(queryByText('null')).not.toBeInTheDocument();
    });

    it('renders mixed null and non-null field types correctly', () => {
      const metricItem = createMockMetric({
        fieldTypes: [ES_FIELD_TYPES.NULL, ES_FIELD_TYPES.DOUBLE],
      });
      const { getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByText('No value')).toBeInTheDocument();
      expect(getByText('double')).toBeInTheDocument();
    });

    it('renders multiple metric types as badges', () => {
      const metricItem = createMockMetric({ metricTypes: ['counter', 'gauge'] });
      const { getByText } = render(<OverviewTab metricItem={metricItem} />);

      expect(getByText('counter')).toBeInTheDocument();
      expect(getByText('gauge')).toBeInTheDocument();
    });
  });

  describe('description display', () => {
    it('renders description when present', () => {
      const metricItem = createMockMetric();
      const { getByTestId, getByText } = render(
        <OverviewTab metricItem={metricItem} description="Test description" />
      );

      expect(getByTestId('metricsExperienceFlyoutMetricDescription')).toBeInTheDocument();
      expect(getByText('Test description')).toBeInTheDocument();
    });
  });
});
