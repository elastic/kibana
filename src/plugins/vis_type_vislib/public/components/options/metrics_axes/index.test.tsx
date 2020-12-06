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
import { mount, shallow } from 'enzyme';

import { IAggConfig, IAggType } from 'src/plugins/data/public';
import MetricsAxisOptions from './index';
import { BasicVislibParams, SeriesParam, ValueAxis } from '../../../types';
import { ValidationVisOptionsProps } from '../../common';
import { Positions } from '../../../utils/collections';
import { ValueAxesPanel } from './value_axes_panel';
import { CategoryAxisPanel } from './category_axis_panel';
import { ChartTypes } from '../../../utils/collections';
import { defaultValueAxisId, valueAxis, seriesParam, categoryAxis } from './mocks';

jest.mock('./series_panel', () => ({
  SeriesPanel: () => 'SeriesPanel',
}));
jest.mock('./category_axis_panel', () => ({
  CategoryAxisPanel: () => 'CategoryAxisPanel',
}));
jest.mock('./value_axes_panel', () => ({
  ValueAxesPanel: () => 'ValueAxesPanel',
}));

const SERIES_PARAMS = 'seriesParams';
const VALUE_AXES = 'valueAxes';

const aggCount: IAggConfig = {
  id: '1',
  type: { name: 'count' },
  makeLabel: () => 'Count',
} as IAggConfig;

const aggAverage: IAggConfig = {
  id: '2',
  type: { name: 'average' } as IAggType,
  makeLabel: () => 'Average',
} as IAggConfig;

const createAggs = (aggs: any[]) => ({
  aggs,
  bySchemaName: () => aggs,
});

describe('MetricsAxisOptions component', () => {
  let setValue: jest.Mock;
  let defaultProps: ValidationVisOptionsProps<BasicVislibParams>;
  let axis: ValueAxis;
  let axisRight: ValueAxis;
  let chart: SeriesParam;

  beforeEach(() => {
    setValue = jest.fn();

    axis = {
      ...valueAxis,
      name: 'LeftAxis-1',
      position: Positions.LEFT,
    };
    axisRight = {
      ...valueAxis,
      id: 'ValueAxis-2',
      name: 'RightAxis-1',
      position: Positions.RIGHT,
    };
    chart = {
      ...seriesParam,
      type: ChartTypes.AREA,
    };

    defaultProps = {
      aggs: createAggs([aggCount]),
      isTabSelected: true,
      vis: {
        type: {
          type: ChartTypes.AREA,
          schemas: { metrics: [{ name: 'metric' }] },
        },
        setState: jest.fn(),
        serialize: jest.fn(),
      },
      stateParams: {
        valueAxes: [axis],
        seriesParams: [chart],
        categoryAxes: [categoryAxis],
        grid: { valueAxis: defaultValueAxisId },
      },
      setValue,
    } as any;
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  describe('useEffect', () => {
    it('should update series when new agg is added', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      comp.setProps({
        aggs: createAggs([aggCount, aggAverage]),
      });

      const updatedSeries = [chart, { ...chart, data: { id: '2', label: aggAverage.makeLabel() } }];
      expect(setValue).toHaveBeenLastCalledWith(SERIES_PARAMS, updatedSeries);
    });

    it('should update series when new agg label is changed', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: aggCount.id, makeLabel: () => 'New label' };
      comp.setProps({
        aggs: createAggs([agg]),
      });

      const updatedSeries = [{ ...chart, data: { id: agg.id, label: agg.makeLabel() } }];
      expect(setValue).toHaveBeenCalledWith(SERIES_PARAMS, updatedSeries);
    });
  });

  describe('updateAxisTitle', () => {
    it('should not update the value axis title if custom title was set', () => {
      defaultProps.stateParams.valueAxes[0].title.text = 'Custom title';
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const newAgg = {
        ...aggCount,
        makeLabel: () => 'Custom label',
      };
      comp.setProps({
        aggs: createAggs([newAgg]),
      });
      const updatedValues = [{ ...axis, title: { text: newAgg.makeLabel() } }];
      expect(setValue).not.toHaveBeenCalledWith(VALUE_AXES, updatedValues);
    });

    it('should set the custom title to match the value axis label when only one agg exists for that axis', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = {
        id: aggCount.id,
        params: { customLabel: 'Custom label' },
        makeLabel: () => 'Custom label',
      };
      comp.setProps({
        aggs: createAggs([agg]),
      });

      const updatedSeriesParams = [{ ...chart, data: { ...chart.data, label: agg.makeLabel() } }];
      const updatedValues = [{ ...axis, title: { text: agg.makeLabel() } }];

      expect(setValue).toHaveBeenCalledTimes(5);
      expect(setValue).toHaveBeenNthCalledWith(3, SERIES_PARAMS, updatedSeriesParams);
      expect(setValue).toHaveBeenNthCalledWith(5, SERIES_PARAMS, updatedSeriesParams);
      expect(setValue).toHaveBeenNthCalledWith(4, VALUE_AXES, updatedValues);
    });

    it('should not set the custom title to match the value axis label when more than one agg exists for that axis', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: aggCount.id, makeLabel: () => 'Custom label' };
      comp.setProps({
        aggs: createAggs([agg, aggAverage]),
        stateParams: {
          ...defaultProps.stateParams,
          seriesParams: [chart, chart],
        },
      });

      expect(setValue).not.toHaveBeenCalledWith(VALUE_AXES);
    });

    it('should not overwrite the custom title with the value axis label if the custom title has been changed', () => {
      defaultProps.stateParams.valueAxes[0].title.text = 'Custom title';
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = {
        id: aggCount.id,
        params: { customLabel: 'Custom label' },
        makeLabel: () => 'Custom label',
      };
      comp.setProps({
        aggs: createAggs([agg]),
      });

      expect(setValue).not.toHaveBeenCalledWith(VALUE_AXES);
    });
  });

  it('should add value axis', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
    comp.find(ValueAxesPanel).prop('addValueAxis')();

    expect(setValue).toHaveBeenCalledWith(VALUE_AXES, [axis, axisRight]);
  });

  describe('removeValueAxis', () => {
    beforeEach(() => {
      defaultProps.stateParams.valueAxes = [axis, axisRight];
    });

    it('should remove value axis', () => {
      const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
      comp.find(ValueAxesPanel).prop('removeValueAxis')(axis);

      expect(setValue).toHaveBeenCalledWith(VALUE_AXES, [axisRight]);
    });

    it('should update seriesParams "valueAxis" prop', () => {
      const updatedSeriesParam = { ...chart, valueAxis: 'ValueAxis-2' };
      const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
      comp.find(ValueAxesPanel).prop('removeValueAxis')(axis);

      expect(setValue).toHaveBeenCalledWith(SERIES_PARAMS, [updatedSeriesParam]);
    });

    it('should reset grid "valueAxis" prop', () => {
      const updatedGrid = { valueAxis: undefined };
      defaultProps.stateParams.seriesParams[0].valueAxis = 'ValueAxis-2';
      const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
      comp.find(ValueAxesPanel).prop('removeValueAxis')(axis);

      expect(setValue).toHaveBeenCalledWith('grid', updatedGrid);
    });
  });

  it('should update axis value when when category position chnaged', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
    comp.find(CategoryAxisPanel).prop('onPositionChanged')(Positions.LEFT);

    const updatedValues = [{ ...axis, name: 'BottomAxis-1', position: Positions.BOTTOM }];
    expect(setValue).toHaveBeenCalledWith(VALUE_AXES, updatedValues);
  });
});
