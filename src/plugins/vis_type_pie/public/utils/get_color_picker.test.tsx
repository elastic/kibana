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
import { LegendColorPickerProps } from '@elastic/charts';
import { EuiWrappingPopover } from '@elastic/eui';
import { mount } from 'enzyme';
import { ComponentType, ReactWrapper } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import { BucketColumns } from '../types';
import { getColorPicker } from './get_color_picker';
import { ColorPicker } from '../temp';

const layersColumns = [
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
    format: {
      id: 'terms',
      params: {
        id: 'string',
        otherBucketLabel: 'Other',
        missingBucketLabel: 'Missing',
      },
    },
  },
  {
    id: 'col-2-3',
    name: 'Cancelled: Descending',
    meta: {
      type: 'boolean',
      field: 'Cancelled',
      index: 'kibana_sample_data_flights',
      params: {
        id: 'terms',
        params: {
          id: 'boolean',
          otherBucketLabel: 'Other',
          missingBucketLabel: 'Missing',
        },
      },
      source: 'esaggs',
      sourceParams: {
        indexPatternId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        id: '3',
        enabled: true,
        type: 'terms',
        params: {
          field: 'Cancelled',
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
    format: {
      id: 'terms',
      params: {
        id: 'boolean',
        otherBucketLabel: 'Other',
        missingBucketLabel: 'Missing',
      },
    },
  },
] as Array<Partial<BucketColumns>>;

const data = [
  {
    'col-0-2': 'Logstash Airways',
    'col-2-3': 0,
    'col-1-1': 726,
    'col-3-1': 624,
  },
  {
    'col-0-2': 'Logstash Airways',
    'col-2-3': 1,
    'col-1-1': 726,
    'col-3-1': 102,
  },
  {
    'col-0-2': 'JetBeats',
    'col-2-3': 0,
    'col-1-1': 703,
    'col-3-1': 602,
  },
  {
    'col-0-2': 'JetBeats',
    'col-2-3': 1,
    'col-1-1': 703,
    'col-3-1': 101,
  },
  {
    'col-0-2': 'ES-Air',
    'col-2-3': 0,
    'col-1-1': 667,
    'col-3-1': 601,
  },
  {
    'col-0-2': 'ES-Air',
    'col-2-3': 1,
    'col-1-1': 667,
    'col-3-1': 66,
  },
  {
    'col-0-2': 'Kibana Airlines',
    'col-2-3': 0,
    'col-1-1': 658,
    'col-3-1': 588,
  },
  {
    'col-0-2': 'Kibana Airlines',
    'col-2-3': 1,
    'col-1-1': 658,
    'col-3-1': 70,
  },
];

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

describe('getColorPicker', function () {
  let wrapperProps: LegendColorPickerProps;
  const Component: ComponentType<LegendColorPickerProps> = getColorPicker(
    'left',
    jest.fn(),
    layersColumns,
    'default',
    data
  );
  let wrapper: ReactWrapper<LegendColorPickerProps>;

  beforeAll(() => {
    wrapperProps = {
      color: 'rgb(109, 204, 177)',
      onClose: jest.fn(),
      onChange: jest.fn(),
      anchor: document.createElement('div'),
      seriesIdentifier: {
        key: 'Logstash Airways',
        specId: 'pie',
      },
    };
  });

  it('renders the color picker for default palette and inner layer', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(findTestSubject(wrapper, 'visColorPicker').length).toBe(1);
  });

  it('renders the picker on the correct position', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(wrapper.find(EuiWrappingPopover).prop('anchorPosition')).toEqual('rightCenter');
  });

  it('converts the color to the right hex and passes it to the color picker', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).prop('color')).toEqual('#6DCCB1');
  });

  it('doesnt render the picker for default palette and not inner layer', () => {
    const newProps = { ...wrapperProps, seriesIdentifier: { key: '1', specId: 'pie' } };
    wrapper = mount(<Component {...newProps} />);
    expect(wrapper).toEqual({});
  });

  it('renders the picker for kibana palette and not inner layer', () => {
    const LegacyPaletteComponent: ComponentType<LegendColorPickerProps> = getColorPicker(
      'left',
      jest.fn(),
      layersColumns,
      'kibana_palette',
      data
    );
    const newProps = { ...wrapperProps, seriesIdentifier: { key: '1', specId: 'pie' } };
    wrapper = mount(<LegacyPaletteComponent {...newProps} />);
    expect(findTestSubject(wrapper, 'visColorPicker').length).toBe(1);
  });
});
