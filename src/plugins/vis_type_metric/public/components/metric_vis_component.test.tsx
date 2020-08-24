/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { MetricVisComponent, MetricVisComponentProps } from './metric_vis_component';

jest.mock('../services', () => ({
  getFormatService: () => ({
    deserialize: () => {
      return {
        convert: (x: unknown) => x,
      };
    },
  }),
}));

type Props = MetricVisComponentProps;

const baseVisData = {
  columns: [{ id: 'col-0', name: 'Count' }],
  rows: [{ 'col-0': 4301021 }],
} as any;

describe('MetricVisComponent', function () {
  const visParams = {
    type: 'metric',
    addTooltip: false,
    addLegend: false,
    metric: {
      colorSchema: 'Green to Red',
      colorsRange: [{ from: 0, to: 1000 }],
      style: {},
      labels: {
        show: true,
      },
    },
    dimensions: {
      metrics: [{ accessor: 0 } as any],
      bucket: undefined,
    },
  };

  const getComponent = (propOverrides: Partial<Props> = {} as Partial<Props>) => {
    const props: Props = {
      visParams: visParams as any,
      visData: baseVisData,
      renderComplete: jest.fn(),
      fireEvent: jest.fn(),
      ...propOverrides,
    };

    return shallow(<MetricVisComponent {...props} />);
  };

  it('should render component', () => {
    expect(getComponent().exists()).toBe(true);
  });

  it('should render correct structure for single metric', function () {
    expect(getComponent()).toMatchSnapshot();
  });

  it('should render correct structure for multi-value metrics', function () {
    const component = getComponent({
      visData: {
        columns: [
          { id: 'col-0', name: '1st percentile of bytes' },
          { id: 'col-1', name: '99th percentile of bytes' },
        ],
        rows: [{ 'col-0': 182, 'col-1': 445842.4634666484 }],
      },
      visParams: {
        ...visParams,
        dimensions: {
          ...visParams.dimensions,
          metrics: [{ accessor: 0 }, { accessor: 1 }],
        },
      },
    } as any);

    expect(component).toMatchSnapshot();
  });
});
