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

import { Vis } from 'src/legacy/core_plugins/visualizations/public';
import { MetricVisComponent, MetricVisComponentProps } from './metric_vis_component';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { npStart } from 'ui/new_platform';
import { fieldFormats } from '../../../../../plugins/data/public';
import { identity } from 'lodash';

jest.mock('ui/new_platform');

type Props = MetricVisComponentProps;

const baseVisData = {
  columns: [{ id: 'col-0', name: 'Count' }],
  rows: [{ 'col-0': 4301021 }],
} as any;

describe('MetricVisComponent', function() {
  const vis: Vis = {
    params: {
      metric: {
        colorSchema: 'Green to Red',
        colorsRange: [{ from: 0, to: 1000 }],
        style: {},
        labels: {
          show: true,
        },
      },
      dimensions: {
        metrics: [{ accessor: 0 }],
        bucket: null,
      },
    },
  } as any;

  const getComponent = (propOverrides: Partial<Props> = {} as Partial<Props>) => {
    const props: Props = {
      vis,
      visParams: vis.params,
      visData: baseVisData,
      renderComplete: jest.fn(),
      ...propOverrides,
    };

    return shallow(<MetricVisComponent {...props} />);
  };

  beforeAll(() => {
    (npStart.plugins.data.fieldFormats.deserialize as jest.Mock).mockImplementation(() => {
      return new (fieldFormats.FieldFormat.from(identity))();
    });
  });

  it('should render component', () => {
    expect(getComponent().exists()).toBe(true);
  });

  it('should render correct structure for single metric', function() {
    expect(getComponent()).toMatchSnapshot();
  });

  it('should render correct structure for multi-value metrics', function() {
    const component = getComponent({
      visData: {
        columns: [
          { id: 'col-0', name: '1st percentile of bytes' },
          { id: 'col-1', name: '99th percentile of bytes' },
        ],
        rows: [{ 'col-0': 182, 'col-1': 445842.4634666484 }],
      },
      visParams: {
        ...vis.params,
        dimensions: {
          ...vis.params.dimensions,
          metrics: [{ accessor: 0 }, { accessor: 1 }],
        },
      },
    } as any);

    expect(component).toMatchSnapshot();
  });
});
