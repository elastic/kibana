/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { Datatable } from '@kbn/expressions-plugin/common';
import MetricVisComponent, { MetricVisComponentProps } from './metric_component';
import { LabelPosition } from '../../common/constants';

jest.mock('../services', () => ({
  getFormatService: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getFormatService } = require('../__mocks__/services');
    return getFormatService();
  },
  getPaletteService: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getPaletteService } = require('../__mocks__/services');
    return getPaletteService();
  },
}));

type Props = MetricVisComponentProps;

const visData: Datatable = {
  type: 'datatable',
  columns: [{ id: 'col-0', name: 'Count', meta: { type: 'number' } }],
  rows: [{ 'col-0': 4301021 }],
};

describe('MetricVisComponent', function () {
  const visParams: Props['visParams'] = {
    metric: {
      metricColorMode: 'None',
      percentageMode: false,
      palette: {
        colors: ['rgb(0, 0, 0, 0)', 'rgb(112, 38, 231)'],
        stops: [0, 10000],
        gradient: false,
        rangeMin: 0,
        rangeMax: 1000,
        range: 'number',
      },
      style: {
        type: 'style',
        spec: {},
        css: '',
        bgColor: false,
        labelColor: false,
      },
      colorFullBackground: false,
      labels: {
        show: true,
        style: { spec: {}, type: 'style', css: '' },
        position: LabelPosition.BOTTOM,
      },
    },
    dimensions: {
      metrics: [{ accessor: 0, type: 'vis_dimension', format: { params: {}, id: 'number' } }],
      bucket: undefined,
    },
  };

  const getComponent = (propOverrides: Partial<Props> = {} as Partial<Props>) => {
    const props: Props = {
      visParams,
      visData,
      renderComplete: jest.fn(),
      fireEvent: jest.fn(),
      filterable: [true],
      ...propOverrides,
    };

    return <MetricVisComponent {...props} />;
  };

  it('should render component', () => {
    expect(shallow(getComponent()).exists()).toBe(true);
  });

  it('should render correct structure for single metric', function () {
    expect(shallow(getComponent())).toMatchSnapshot();
  });

  it('should render correct structure for multi-value metrics', function () {
    const component = getComponent({
      filterable: [true, false],
      visData: {
        type: 'datatable',
        columns: [
          { id: 'col-0', name: '1st percentile of bytes', meta: { type: 'number' } },
          { id: 'col-1', name: '99th percentile of bytes', meta: { type: 'number' } },
        ],
        rows: [{ 'col-0': 182, 'col-1': 445842.4634666484 }],
      },
      visParams: {
        ...visParams,
        dimensions: {
          ...visParams.dimensions,
          metrics: [
            { accessor: 0, type: 'vis_dimension', format: { id: 'number', params: {} } },
            { accessor: 1, type: 'vis_dimension', format: { id: 'number', params: {} } },
          ],
        },
      },
    });

    expect(shallow(component)).toMatchSnapshot();
  });

  it('should call renderComplete once for multi-value metrics', function () {
    const renderComplete = jest.fn();
    const component = getComponent({
      renderComplete,
      filterable: [true, false],
      visData: {
        type: 'datatable',
        columns: [
          { id: 'col-0', name: '1st percentile of bytes', meta: { type: 'number' } },
          { id: 'col-1', name: '99th percentile of bytes', meta: { type: 'number' } },
        ],
        rows: [{ 'col-0': 182, 'col-1': 445842.4634666484 }],
      },
      visParams: {
        ...visParams,
        dimensions: {
          ...visParams.dimensions,
          metrics: [
            { accessor: 0, type: 'vis_dimension', format: { id: 'number', params: {} } },
            { accessor: 1, type: 'vis_dimension', format: { id: 'number', params: {} } },
          ],
        },
      },
    });

    mount(component);

    expect(renderComplete).toHaveBeenCalledTimes(1);
  });
});
