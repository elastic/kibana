/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { Wordcloud, Settings } from '@elastic/charts';
import { chartPluginMock } from '../../../charts/public/mocks';
import type { Datatable } from '../../../expressions/public';
import { mount } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';
import TagCloudChart, { TagCloudChartProps } from './tag_cloud_chart';
import { TagCloudVisParams } from '../types';

jest.mock('../services', () => ({
  getFormatService: jest.fn(() => {
    return {
      deserialize: jest.fn(),
    };
  }),
}));

const palettesRegistry = chartPluginMock.createPaletteRegistry();
const visData = ({
  columns: [
    {
      id: 'col-0',
      name: 'geo.dest: Descending',
    },
    {
      id: 'col-1',
      name: 'Count',
    },
  ],
  rows: [
    { 'col-0': 'CN', 'col-1': 26 },
    { 'col-0': 'IN', 'col-1': 17 },
    { 'col-0': 'US', 'col-1': 6 },
    { 'col-0': 'DE', 'col-1': 4 },
    { 'col-0': 'BR', 'col-1': 3 },
  ],
} as unknown) as Datatable;

const visParams = {
  bucket: { accessor: 0, format: {} },
  metric: { accessor: 1, format: {} },
  scale: 'linear',
  orientation: 'single',
  palette: {
    type: 'palette',
    name: 'default',
  },
  minFontSize: 12,
  maxFontSize: 70,
  showLabel: true,
} as TagCloudVisParams;

describe('TagCloudChart', function () {
  let wrapperProps: TagCloudChartProps;

  beforeAll(() => {
    wrapperProps = {
      visData,
      visParams,
      palettesRegistry,
      fireEvent: jest.fn(),
      renderComplete: jest.fn(),
      syncColors: false,
      visType: 'tagcloud',
    };
  });

  it('renders the Wordcloud component', async () => {
    const component = mount(<TagCloudChart {...wrapperProps} />);
    expect(component.find(Wordcloud).length).toBe(1);
  });

  it('renders the label correctly', async () => {
    const component = mount(<TagCloudChart {...wrapperProps} />);
    const label = findTestSubject(component, 'tagCloudLabel');
    expect(label.text()).toEqual('geo.dest: Descending - Count');
  });

  it('not renders the label if showLabel setting is off', async () => {
    const newVisParams = { ...visParams, showLabel: false };
    const newProps = { ...wrapperProps, visParams: newVisParams };
    const component = mount(<TagCloudChart {...newProps} />);
    const label = findTestSubject(component, 'tagCloudLabel');
    expect(label.length).toBe(0);
  });

  it('receives the data on the correct format', () => {
    const component = mount(<TagCloudChart {...wrapperProps} />);
    expect(component.find(Wordcloud).prop('data')).toStrictEqual([
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
    ]);
  });

  it('sets the angles correctly', async () => {
    const newVisParams = { ...visParams, orientation: 'right angled' } as TagCloudVisParams;
    const newProps = { ...wrapperProps, visParams: newVisParams };
    const component = mount(<TagCloudChart {...newProps} />);
    expect(component.find(Wordcloud).prop('endAngle')).toBe(90);
    expect(component.find(Wordcloud).prop('angleCount')).toBe(2);
  });

  it('calls filter callback', () => {
    const component = mount(<TagCloudChart {...wrapperProps} />);
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
    expect(wrapperProps.fireEvent).toHaveBeenCalled();
  });
});
