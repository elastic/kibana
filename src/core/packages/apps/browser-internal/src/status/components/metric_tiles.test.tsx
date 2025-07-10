/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricTile } from './metric_tiles';
import { Metric } from '../lib';

const untypedMetric: Metric = {
  name: 'A metric',
  value: 1.8,
  // no type specified
};

const byteMetric: Metric = {
  name: 'Heap Total',
  value: 1501560832,
  type: 'byte',
};

const floatMetric: Metric = {
  name: 'Load',
  type: 'float',
  value: [4.0537109375, 3.36669921875, 3.1220703125],
};

const timeMetric: Metric = {
  name: 'Response Time Max',
  type: 'time',
  value: 1234,
};

const metricWithMeta: Metric = {
  name: 'Delay',
  type: 'time',
  value: 1,
  meta: {
    description: 'Percentiles',
    title: '',
    value: [1, 5, 10],
    type: 'time',
  },
};

describe('MetricTile', () => {
  it('correct displays an untyped metric', () => {
    render(<MetricTile metric={untypedMetric} />);
    expect(screen.getByTestId('serverMetric-a-metric')).toBeInTheDocument();
    expect(screen.getByText('A metric')).toBeInTheDocument();
    expect(screen.getByText('1.80')).toBeInTheDocument();
  });
  it('correct displays a byte metric', () => {
    render(<MetricTile metric={byteMetric} />);
    expect(screen.getByTestId('serverMetric-heap-total')).toBeInTheDocument();
    expect(screen.getByText('Heap Total')).toBeInTheDocument();
    expect(screen.getByText('1.40 GB')).toBeInTheDocument();
  });

  it('correct displays a float metric', () => {
    render(<MetricTile metric={floatMetric} />);
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('4.05, 3.37, 3.12')).toBeInTheDocument();
  });

  it('correct displays a time metric', () => {
    const { getByTestId } = render(<MetricTile metric={timeMetric} />);
    const card = getByTestId('serverMetric-response-time-max');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Response Time Max');
    expect(card).toHaveTextContent('1234.00 ms');
  });

  it('correctly displays a metric with metadata', () => {
    const { getByTestId } = render(<MetricTile metric={metricWithMeta} />);
    const card = getByTestId('serverMetric-delay');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Delay avg');
    expect(card).toHaveTextContent('1.00 ms');
    expect(card).toHaveTextContent('Percentiles');
    expect(card).toHaveTextContent('50: 1.00 ms; 95: 5.00 ms; 99: 10.00 ms', {
      normalizeWhitespace: true,
    });
  });
});
