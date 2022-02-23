/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { Wordcloud, Settings, WordcloudSpec } from '@elastic/charts';
import { chartPluginMock } from '../../../../charts/public/mocks';
import type { Datatable } from '../../../../expressions/public';
import { mount } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import TagCloudChart, { TagCloudChartProps } from './tagcloud_component';
import { TagCloudRendererParams } from '../../common/types';
import { ScaleOptions, Orientation } from '../../common/constants';

jest.mock('../format_service', () => ({
  getFormatService: jest.fn(() => {
    return {
      deserialize: jest.fn(),
    };
  }),
}));

const palettesRegistry = chartPluginMock.createPaletteRegistry();
const geoDestId = 'geo.dest';
const countId = 'Count';
const visData: Datatable = {
  type: 'datatable',
  columns: [
    {
      id: geoDestId,
      name: `${geoDestId}: Descending`,
      meta: { type: 'string' },
    },
    {
      id: countId,
      name: 'Count',
      meta: { type: 'number' },
    },
  ],
  rows: [
    { [geoDestId]: 'CN', [countId]: 26 },
    { [geoDestId]: 'IN', [countId]: 17 },
    { [geoDestId]: 'US', [countId]: 6 },
    { [geoDestId]: 'DE', [countId]: 4 },
    { [geoDestId]: 'BR', [countId]: 3 },
  ],
};

const visParams: TagCloudRendererParams = {
  bucket: { type: 'vis_dimension', accessor: 0, format: { params: {} } },
  metric: { type: 'vis_dimension', accessor: 1, format: { params: {} } },
  scale: ScaleOptions.LINEAR,
  orientation: Orientation.SINGLE,
  palette: {
    type: 'palette',
    name: 'default',
  },
  minFontSize: 12,
  maxFontSize: 70,
  showLabel: true,
};

const formattedData: WordcloudSpec['data'] = [
  {
    color: 'black',
    text: 'CN',
    weight: 1,
  },
  {
    color: 'black',
    text: 'IN',
    weight: 0.6086956521739131,
  },
  {
    color: 'black',
    text: 'US',
    weight: 0.13043478260869565,
  },
  {
    color: 'black',
    text: 'DE',
    weight: 0.043478260869565216,
  },
  {
    color: 'black',
    text: 'BR',
    weight: 0,
  },
];

describe('TagCloudChart', function () {
  let wrapperPropsWithIndexes: TagCloudChartProps;
  let wrapperPropsWithColumnNames: TagCloudChartProps;

  beforeAll(() => {
    wrapperPropsWithIndexes = {
      visData,
      visParams,
      palettesRegistry,
      fireEvent: jest.fn(),
      renderComplete: jest.fn(),
      syncColors: false,
      visType: 'tagcloud',
    };

    wrapperPropsWithColumnNames = {
      visData,
      visParams: {
        ...visParams,
        bucket: {
          type: 'vis_dimension',
          accessor: {
            id: geoDestId,
            name: geoDestId,
            meta: { type: 'string' },
          },
          format: { id: 'string', params: {} },
        },
        metric: {
          type: 'vis_dimension',
          accessor: {
            id: countId,
            name: countId,
            meta: { type: 'number' },
          },
          format: { id: 'number', params: {} },
        },
      },
      palettesRegistry,
      fireEvent: jest.fn(),
      renderComplete: jest.fn(),
      syncColors: false,
      visType: 'tagcloud',
    };
  });

  it('renders the Wordcloud component with', async () => {
    const component = mount(<TagCloudChart {...wrapperPropsWithIndexes} />);
    expect(component.find(Wordcloud).length).toBe(1);
  });

  it('renders the label correctly', async () => {
    const component = mount(<TagCloudChart {...wrapperPropsWithIndexes} />);
    const label = findTestSubject(component, 'tagCloudLabel');
    expect(label.text()).toEqual('geo.dest: Descending - Count');
  });

  it('not renders the label if showLabel setting is off', async () => {
    const newVisParams = { ...visParams, showLabel: false };
    const newProps = { ...wrapperPropsWithIndexes, visParams: newVisParams };
    const component = mount(<TagCloudChart {...newProps} />);
    const label = findTestSubject(component, 'tagCloudLabel');
    expect(label.length).toBe(0);
  });

  it('receives the data in the correct format for bucket and metric accessors of type number', () => {
    const component = mount(<TagCloudChart {...wrapperPropsWithIndexes} />);
    expect(component.find(Wordcloud).prop('data')).toStrictEqual(formattedData);
  });

  it('receives the data in the correct format for bucket and metric accessors of type DatatableColumn', () => {
    const component = mount(<TagCloudChart {...wrapperPropsWithColumnNames} />);
    expect(component.find(Wordcloud).prop('data')).toStrictEqual(formattedData);
  });

  it('sets the angles correctly', async () => {
    const newVisParams: TagCloudRendererParams = {
      ...visParams,
      orientation: Orientation.RIGHT_ANGLED,
    };
    const newProps = { ...wrapperPropsWithIndexes, visParams: newVisParams };
    const component = mount(<TagCloudChart {...newProps} />);
    expect(component.find(Wordcloud).prop('endAngle')).toBe(90);
    expect(component.find(Wordcloud).prop('angleCount')).toBe(2);
  });

  it('calls filter callback', () => {
    const component = mount(<TagCloudChart {...wrapperPropsWithIndexes} />);
    component.find(Settings).prop('onElementClick')!([
      [
        {
          text: 'BR',
          weight: 0.17391304347826086,
          color: '#d36086',
        },
        {
          specId: 'tagCloud',
          key: 'tagCloud',
        },
      ],
    ]);
    expect(wrapperPropsWithIndexes.fireEvent).toHaveBeenCalled();
  });
});
