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
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { METRIC_TYPE_DESCRIPTIONS } from '../components';
import { OverviewTabMetadata } from './overview_tab_metadata';

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

describe('OverviewTabMetadata', () => {
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
    it('renders main description list', () => {
      const metricItem = createMockMetric({
        dataStream: 'my-data-stream',
        fieldTypes: [ES_FIELD_TYPES.LONG],
      });
      const { getByTestId, getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabDescriptionList')).toBeInTheDocument();
      expect(getByText('my-data-stream')).toBeInTheDocument();
      expect(getByText('long')).toBeInTheDocument();
    });
  });

  describe('unit display', () => {
    it('renders unit when present', () => {
      const metricItem = createMockMetric({ units: ['ms'] });
      const { getByTestId, getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricUnitLabel')).toBeInTheDocument();
      expect(getByText('Milliseconds')).toBeInTheDocument();
    });

    it('renders NoValueBadge when units are empty', () => {
      const metricItem = createMockMetric({ units: [] });
      const { getByTestId, getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricUnitLabel')).toBeInTheDocument();
      expect(getByText('No value')).toBeInTheDocument();
    });
  });

  describe('instrument display', () => {
    it('renders instrument when present', () => {
      const metricItem = createMockMetric({ metricTypes: ['counter'] });
      const { getByTestId, getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')).toBeInTheDocument();
      expect(getByText('counter')).toBeInTheDocument();
    });

    it('renders NoValueBadge when metricTypes is undefined', () => {
      const metricItem = createMockMetric({ metricTypes: undefined });
      const { getByTestId, getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')).toBeInTheDocument();
      expect(getByText('No value')).toBeInTheDocument();
    });

    it('handles different instrument types', () => {
      const instruments = ['counter', 'gauge', 'histogram'] as const;

      instruments.forEach((instrument) => {
        const metricItem = createMockMetric({ metricTypes: [instrument] });
        const { rerender, getByTestId, getByText } = render(
          <OverviewTabMetadata metricItem={metricItem} />
        );

        expect(
          getByTestId('metricsExperienceFlyoutOverviewTabMetricTypeLabel')
        ).toBeInTheDocument();
        expect(getByText(instrument)).toBeInTheDocument();

        rerender(<div />);
      });
    });

    it.each(['gauge', 'counter', 'histogram'] as const)(
      'shows tooltip with description when hovering over %s badge',
      async (instrument) => {
        const metricItem = createMockMetric({ metricTypes: [instrument] });
        render(<OverviewTabMetadata metricItem={metricItem} />);

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
      render(<OverviewTabMetadata metricItem={metricItem} />);

      const badge = screen.getByText('position');
      await userEvent.hover(badge);

      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('multiple values display', () => {
    it('renders multiple field types as badges', () => {
      const metricItem = createMockMetric({
        fieldTypes: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
      });
      const { getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByText('double')).toBeInTheDocument();
      expect(getByText('long')).toBeInTheDocument();
    });

    it('renders multiple units as badges', () => {
      const metricItem = createMockMetric({ units: ['ms', 'bytes'] });
      const { getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByText('Milliseconds')).toBeInTheDocument();
      expect(getByText('Bytes')).toBeInTheDocument();
    });

    it('renders null field type as NoValueBadge', () => {
      const metricItem = createMockMetric({
        fieldTypes: [ES_FIELD_TYPES.NULL],
      });
      const { getByText, queryByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByText('No value')).toBeInTheDocument();
      expect(queryByText('null')).not.toBeInTheDocument();
    });

    it('renders mixed null and non-null field types correctly', () => {
      const metricItem = createMockMetric({
        fieldTypes: [ES_FIELD_TYPES.NULL, ES_FIELD_TYPES.DOUBLE],
      });
      const { getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByText('No value')).toBeInTheDocument();
      expect(getByText('double')).toBeInTheDocument();
    });

    it('renders multiple metric types as badges', () => {
      const metricItem = createMockMetric({ metricTypes: ['counter', 'gauge'] });
      const { getByText } = render(<OverviewTabMetadata metricItem={metricItem} />);

      expect(getByText('counter')).toBeInTheDocument();
      expect(getByText('gauge')).toBeInTheDocument();
    });
  });
});
