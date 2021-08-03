/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { ReactWrapper } from 'enzyme';
import { PointSeriesOptions } from './point_series';
import { findTestSubject } from '@elastic/eui/lib/test';
import { act } from 'react-dom/test-utils';
import { ChartType } from '../../../../../common';
import { getAggs, getVis, getStateParams } from './point_series.mocks';

jest.mock('../../../../services', () => ({
  getTrackUiMetric: jest.fn(() => null),
  getPalettesService: jest.fn(() => {
    return {
      getPalettes: jest.fn(),
    };
  }),
}));

type PointSeriesOptionsProps = Parameters<typeof PointSeriesOptions>[0];

describe('PointSeries Editor', function () {
  let props: PointSeriesOptionsProps;
  let component: ReactWrapper<PointSeriesOptionsProps>;

  beforeEach(() => {
    props = ({
      aggs: getAggs(),
      hasHistogramAgg: false,
      extraProps: {
        showElasticChartsOptions: false,
      },
      isTabSelected: false,
      setMultipleValidity: jest.fn(),
      setTouched: jest.fn(),
      setValue: jest.fn(),
      setValidity: jest.fn(),
      stateParams: getStateParams(ChartType.Histogram, false),
      vis: getVis('date_histogram'),
    } as unknown) as PointSeriesOptionsProps;
  });

  it('renders the showValuesOnChart switch for a bar chart', async () => {
    component = mountWithIntl(<PointSeriesOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'showValuesOnChart')).toHaveLength(1);
    });
  });

  it('not renders the showValuesOnChart switch for an area chart', async () => {
    const areaVisProps = ({
      ...props,
      stateParams: getStateParams(ChartType.Area, false),
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...areaVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'showValuesOnChart').length).toBe(0);
    });
  });

  it('renders the addTimeMarker switch for a date histogram bucket', async () => {
    component = mountWithIntl(<PointSeriesOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'addTimeMarker').length).toBe(1);
      expect(findTestSubject(component, 'orderBucketsBySum').length).toBe(0);
    });
  });

  it('renders the orderBucketsBySum switch for a non date histogram bucket', async () => {
    const newVisProps = ({
      ...props,
      vis: getVis('terms'),
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...newVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'addTimeMarker').length).toBe(0);
      expect(findTestSubject(component, 'orderBucketsBySum').length).toBe(1);
    });
  });

  it('not renders the editor options that are specific for the es charts implementation if showElasticChartsOptions is false', async () => {
    component = mountWithIntl(<PointSeriesOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'detailedTooltip').length).toBe(0);
    });
  });

  it('renders the editor options that are specific for the es charts implementation if showElasticChartsOptions is true', async () => {
    const newVisProps = ({
      ...props,
      extraProps: {
        showElasticChartsOptions: true,
      },
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...newVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'detailedTooltip').length).toBe(1);
    });
  });

  it('not renders the fitting function for a bar chart', async () => {
    const newVisProps = ({
      ...props,
      extraProps: {
        showElasticChartsOptions: true,
      },
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...newVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'fittingFunction').length).toBe(0);
    });
  });

  it('renders the fitting function for a line chart', async () => {
    const newVisProps = ({
      ...props,
      stateParams: getStateParams(ChartType.Line, false),
      extraProps: {
        showElasticChartsOptions: true,
      },
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...newVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'fittingFunction').length).toBe(1);
    });
  });

  it('renders the showCategoryLines switch', async () => {
    const newVisProps = ({
      ...props,
      extraProps: {
        showElasticChartsOptions: true,
      },
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...newVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'showValuesOnChart').length).toBe(1);
    });
  });

  it('not renders the threshold panel if the Show threshold line switch is off', async () => {
    component = mountWithIntl(<PointSeriesOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'thresholdValueInputOption').length).toBe(0);
    });
  });

  it('renders the threshold panel if the Show threshold line switch is on', async () => {
    const newVisProps = ({
      ...props,
      stateParams: getStateParams(ChartType.Histogram, true),
    } as unknown) as PointSeriesOptionsProps;
    component = mountWithIntl(<PointSeriesOptions {...newVisProps} />);
    await act(async () => {
      expect(findTestSubject(component, 'thresholdValueInputOption').length).toBe(1);
    });
  });
});
