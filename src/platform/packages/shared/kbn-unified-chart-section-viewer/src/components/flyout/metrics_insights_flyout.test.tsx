/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MetricInsightsFlyout } from './metrics_insights_flyout';
import type { MetricField } from '../../types';
import { ES_FIELD_TYPES } from '@kbn/field-types';

jest.mock('./metrics_flyout_body', () => ({
  MetricFlyoutBody: jest.fn(() => <div data-test-subj="metricFlyoutBody" />),
}));

jest.mock('./hooks/use_flyout_a11y', () => ({
  useFlyoutA11y: jest.fn(() => ({
    a11yProps: {},
    screenReaderDescription: null,
  })),
}));

jest.mock('../../context/fields_metadata', () => ({
  useFieldsMetadataContext: jest.fn(() => ({
    fieldsMetadata: {},
  })),
}));

jest.mock('react-use/lib/useLocalStorage', () => {
  return jest.fn(() => [544, jest.fn()]);
});

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useIsWithinMinBreakpoint: jest.fn(() => true),
  };
});

describe('MetricInsightsFlyout', () => {
  const mockMetricFlyoutBody = jest.requireMock('./metrics_flyout_body').MetricFlyoutBody;
  const mockUseFlyoutA11y = jest.requireMock('./hooks/use_flyout_a11y').useFlyoutA11y;
  const mockUseFieldsMetadataContext = jest.requireMock(
    '../../context/fields_metadata'
  ).useFieldsMetadataContext;
  const mockUseIsWithinMinBreakpoint = jest.requireMock('@elastic/eui').useIsWithinMinBreakpoint;

  const createMockMetric = (overrides: Partial<MetricField> = {}): MetricField => ({
    name: 'test.metric',
    index: 'test-index',
    type: ES_FIELD_TYPES.DOUBLE,
    dimensions: [],
    ...overrides,
  });

  const defaultProps = {
    metric: createMockMetric(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsWithinMinBreakpoint.mockReturnValue(true); // Simulate XL screen (push mode)
    mockUseFieldsMetadataContext.mockReturnValue({ fieldsMetadata: {} });
    mockUseFlyoutA11y.mockReturnValue({ a11yProps: {}, screenReaderDescription: null });
  });

  describe('rendering', () => {
    it('renders the flyout with correct structure', () => {
      render(<MetricInsightsFlyout {...defaultProps} />);

      expect(screen.getByTestId('metricsExperienceFlyout')).toBeInTheDocument();
      expect(screen.getByTestId('metricsExperienceFlyoutRowDetailsTitle')).toBeInTheDocument();
      expect(screen.getByText('Metric')).toBeInTheDocument();
    });

    it('renders the flyout body with MetricFlyoutBody', () => {
      render(<MetricInsightsFlyout {...defaultProps} />);

      expect(screen.getByTestId('metricFlyoutBody')).toBeInTheDocument();
    });
  });

  describe('keyboard interactions', () => {
    it('calls onClose and prevents default when Escape key is pressed on the flyout', () => {
      const onClose = jest.fn();
      render(<MetricInsightsFlyout {...defaultProps} onClose={onClose} />);

      const flyout = screen.getByTestId('metricsExperienceFlyout');
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      fireEvent(flyout, event);

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('does not call onClose for non-Escape keys', () => {
      const onClose = jest.fn();
      render(<MetricInsightsFlyout {...defaultProps} onClose={onClose} />);

      const flyout = screen.getByTestId('metricsExperienceFlyout');
      fireEvent.keyDown(flyout, { key: 'Enter', bubbles: true });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not call onClose when Escape is pressed on non-XL screens', () => {
      mockUseIsWithinMinBreakpoint.mockReturnValue(false);
      const onClose = jest.fn();
      render(<MetricInsightsFlyout {...defaultProps} onClose={onClose} />);

      const flyout = screen.getByTestId('metricsExperienceFlyout');
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      fireEvent(flyout, event);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('prop handling', () => {
    it('passes metric prop to MetricFlyoutBody', () => {
      const metric = createMockMetric({ name: 'custom.metric' });

      render(<MetricInsightsFlyout {...defaultProps} metric={metric} />);

      expect(mockMetricFlyoutBody).toHaveBeenCalledWith(
        expect.objectContaining({ metric }),
        expect.anything()
      );
    });

    it('passes esqlQuery prop to MetricFlyoutBody', () => {
      const esqlQuery = 'FROM test | STATS avg(value)';

      render(<MetricInsightsFlyout {...defaultProps} esqlQuery={esqlQuery} />);

      expect(mockMetricFlyoutBody).toHaveBeenCalledWith(
        expect.objectContaining({ esqlQuery }),
        expect.anything()
      );
    });

    it('passes description from fieldsMetadata to MetricFlyoutBody', () => {
      mockUseFieldsMetadataContext.mockReturnValue({
        fieldsMetadata: {
          'test.metric': { description: 'Test metric description' },
        },
      });

      render(<MetricInsightsFlyout {...defaultProps} />);

      expect(mockMetricFlyoutBody).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Test metric description' }),
        expect.anything()
      );
    });

    it('passes undefined description when not in fieldsMetadata', () => {
      mockUseFieldsMetadataContext.mockReturnValue({ fieldsMetadata: {} });

      render(<MetricInsightsFlyout {...defaultProps} />);

      expect(mockMetricFlyoutBody).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
        expect.anything()
      );
    });
  });

  describe('accessibility', () => {
    it('renders the title as h2 with id for aria-labelledby', () => {
      render(<MetricInsightsFlyout {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Metric');
      expect(heading).toHaveAttribute('id');
      expect(heading.getAttribute('id')).toContain('metricFlyoutTitle');
    });

    it('renders screen reader description when provided by useFlyoutA11y', () => {
      mockUseFlyoutA11y.mockReturnValue({
        a11yProps: { role: 'dialog' },
        screenReaderDescription: (
          <p data-test-subj="metricsExperienceFlyoutScreenReaderDescription">
            Screen reader description
          </p>
        ),
      });

      render(<MetricInsightsFlyout {...defaultProps} />);

      expect(
        screen.getByTestId('metricsExperienceFlyoutScreenReaderDescription')
      ).toBeInTheDocument();
    });
  });
});
