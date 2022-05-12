/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
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
    const component = shallow(<MetricTile metric={untypedMetric} />);
    expect(component).toMatchSnapshot();
  });

  it('correct displays a byte metric', () => {
    const component = shallow(<MetricTile metric={byteMetric} />);
    expect(component).toMatchSnapshot();
  });

  it('correct displays a float metric', () => {
    const component = shallow(<MetricTile metric={floatMetric} />);
    expect(component).toMatchSnapshot();
  });

  it('correct displays a time metric', () => {
    const component = shallow(<MetricTile metric={timeMetric} />);
    expect(component).toMatchSnapshot();
  });

  it('correctly displays a metric with metadata', () => {
    const component = shallow(<MetricTile metric={metricWithMeta} />);
    expect(component).toMatchSnapshot();
  });
});
