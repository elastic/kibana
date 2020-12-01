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
import { Settings, TooltipType, SeriesIdentifier } from '@elastic/charts';
import { Datatable } from '../../expressions/public';
import { chartPluginMock } from '../../charts/public/mocks';
import { shallow, mount } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { PieVisParams } from './types';
import PieComponent, { PieComponentProps } from './pie_component';

jest.mock('./services', () => ({
  getColorsService: jest.fn().mockReturnValue({
    get: jest.fn(),
    getAll: jest.fn(),
  }),
  getFormatService: jest.fn().mockReturnValue({
    deserialize: jest.fn(),
    getAll: jest.fn(),
  }),
}));

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

const chartsThemeService = chartPluginMock.createSetupContract().theme;

const visParams = ({
  addLegend: true,
  addTooltip: true,
  isDonut: true,
  labels: {
    position: 'default',
    show: true,
    truncate: 100,
    values: true,
    valuesFormat: 'percent',
  },
  legendPosition: 'right',
  nestedLegend: false,
  palette: {
    name: 'default',
    type: 'palette',
  },
  type: 'pie',
  dimensions: {
    metric: {
      accessor: 1,
      format: {
        id: 'number',
      },
      params: {},
      label: 'Count',
      aggType: 'count',
    },
    buckets: [
      {
        accessor: 0,
        format: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
          },
        },
        params: {},
        label: 'Carrier: Descending',
        aggType: 'terms',
      },
    ],
  },
} as unknown) as PieVisParams;

const visData = {
  type: 'datatable',
  rows: [
    {
      'col-0-2': 'Logstash Airways',
      'col-1-1': 709,
    },
    {
      'col-0-2': 'JetBeats',
      'col-1-1': 692,
    },
    {
      'col-0-2': 'ES-Air',
      'col-1-1': 662,
    },
    {
      'col-0-2': 'Kibana Airlines',
      'col-1-1': 647,
    },
  ],
  columns: [
    {
      id: 'col-0-2',
      name: 'Carrier: Descending',
      meta: {
        type: 'string',
        field: 'Carrier',
        index: 'kibana_sample_data_flights',
        params: {
          id: 'terms',
          params: {
            id: 'string',
            otherBucketLabel: 'Other',
            missingBucketLabel: 'Missing',
          },
        },
        source: 'esaggs',
        sourceParams: {
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          id: '2',
          enabled: true,
          type: 'terms',
          params: {
            field: 'Carrier',
            orderBy: '1',
            order: 'desc',
            size: 5,
            otherBucket: false,
            otherBucketLabel: 'Other',
            missingBucket: false,
            missingBucketLabel: 'Missing',
          },
          schema: 'segment',
        },
      },
    },
    {
      id: 'col-1-1',
      name: 'Count',
      meta: {
        type: 'number',
        index: 'kibana_sample_data_flights',
        params: {
          id: 'number',
        },
        source: 'esaggs',
        sourceParams: {
          indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          id: '1',
          enabled: true,
          type: 'count',
          params: {},
          schema: 'metric',
        },
      },
    },
  ],
} as Datatable;

const mockState = new Map();
const uiState = {
  get: jest
    .fn()
    .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
  set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
  emit: jest.fn(),
  setSilent: jest.fn(),
} as any;

describe('PieComponent', function () {
  let wrapperProps: PieComponentProps;

  beforeAll(() => {
    wrapperProps = {
      chartsThemeService,
      visParams,
      visData,
      uiState,
      fireEvent: jest.fn(),
      renderComplete: jest.fn(),
    };
  });

  it('renders the legend on the correct position', () => {
    const component = shallow(<PieComponent {...wrapperProps} />);
    expect(component.find(Settings).prop('legendPosition')).toEqual('right');
  });

  it('renders the legend toggle component', () => {
    const component = mount(<PieComponent {...wrapperProps} />);
    expect(findTestSubject(component, 'vislibToggleLegend').length).toBe(1);
  });

  it('hides the legend if the legend toggle is clicked', () => {
    const component = mount(<PieComponent {...wrapperProps} />);
    const toggle = findTestSubject(component, 'vislibToggleLegend');
    toggle.simulate('click');
    expect(component.find(Settings).prop('showLegend')).toEqual(false);
  });

  it('defaults on showing the legend for the inner cicle', () => {
    const component = shallow(<PieComponent {...wrapperProps} />);
    expect(component.find(Settings).prop('legendMaxDepth')).toBe(1);
  });

  it('shows the nested legend when the user requests it', () => {
    const newParams = { ...visParams, nestedLegend: true };
    const newProps = { ...wrapperProps, visParams: newParams };
    const component = shallow(<PieComponent {...newProps} />);
    expect(component.find(Settings).prop('legendMaxDepth')).toBeUndefined();
  });

  it('defaults on displaying the tooltip', () => {
    const component = shallow(<PieComponent {...wrapperProps} />);
    expect(component.find(Settings).prop('tooltip')).toStrictEqual({ type: TooltipType.Follow });
  });

  it('doesnt show the tooltip when the user requests it', () => {
    const newParams = { ...visParams, addTooltip: false };
    const newProps = { ...wrapperProps, visParams: newParams };
    const component = shallow(<PieComponent {...newProps} />);
    expect(component.find(Settings).prop('tooltip')).toStrictEqual({ type: TooltipType.None });
  });

  it('calls filter callback', () => {
    const component = shallow(<PieComponent {...wrapperProps} />);
    component.find(Settings).first().prop('onElementClick')!([
      [[{ groupByRollup: 6, value: 6 }], {} as SeriesIdentifier],
    ]);
    expect(wrapperProps.fireEvent).toHaveBeenCalled();
  });
});
