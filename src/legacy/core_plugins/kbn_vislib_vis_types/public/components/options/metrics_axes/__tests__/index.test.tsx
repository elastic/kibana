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
import { act } from 'react-dom/test-utils';
import { MetricsAxisOptions } from '../index';
import { BasicVislibParams, SeriesParam, ValueAxis } from '../../../../types';
import { ValidationVisOptionsProps } from '../../../common';
import { Positions } from '../../../../utils/collections';
import { ValueAxesPanel } from '../value_axes_panel';
import { CategoryAxisPanel } from '../category_axis_panel';
import { ChartTypes } from '../../../../utils/collections';
import { AggConfig } from 'ui/vis';

jest.mock('../series_panel', () => ({
  SeriesPanel: () => 'SeriesPanel',
}));
jest.mock('../category_axis_panel', () => ({
  CategoryAxisPanel: () => 'CategoryAxisPanel',
}));
jest.mock('../value_axes_panel', () => ({
  ValueAxesPanel: () => 'ValueAxesPanel',
}));

describe('MetricsAxisOptions component', () => {
  let setValue: jest.Mock;
  let setVisType: jest.Mock;
  let defaultProps: ValidationVisOptionsProps<BasicVislibParams>;
  let aggs;
  const defaultValueAxisId = 'ValueAxis-1';
  let axis: ValueAxis;
  let axisRight: ValueAxis;
  let seriesParam: SeriesParam;
  const aggCount = {
    id: '1',
    type: { name: 'count' },
    makeLabel: () => 'Count',
  } as AggConfig;
  const aggAverage = {
    id: '2',
    type: { name: 'average' },
    makeLabel: () => 'Average',
  } as AggConfig;
  const chart = {
    show: true,
    type: ChartTypes.HISTOGRAM,
  } as SeriesParam;

  beforeEach(() => {
    setValue = jest.fn();
    setVisType = jest.fn();

    aggs = {
      aggs: [aggCount],
      bySchemaName: () => [aggCount],
    };

    axis = {
      id: defaultValueAxisId,
      name: 'LeftAxis-1',
      position: Positions.LEFT,
      title: { text: '' },
    } as ValueAxis;
    axisRight = {
      id: 'ValueAxis-2',
      name: 'RightAxis-1',
      position: Positions.RIGHT,
      title: { text: '' },
    } as ValueAxis;
    seriesParam = {
      type: ChartTypes.AREA,
      data: {
        label: 'Count',
        id: '1',
      },
      valueAxis: defaultValueAxisId,
    } as SeriesParam;

    defaultProps = {
      aggs,
      aggsLabels: '',
      vis: {
        type: {
          type: ChartTypes.AREA,
          schemas: { metrics: [{ name: 'metric' }] },
        },
      },
      stateParams: {
        valueAxes: [axis],
        seriesParams: [seriesParam],
        categoryAxes: [axis],
        grid: { valueAxis: defaultValueAxisId },
      },
      setValue,
      setVisType,
    } as any;
  });

  afterEach(() => {
    setValue.mockClear();
    setVisType.mockClear();
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  describe('useEffect', () => {
    it('should update series when new agg is added', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      comp.setProps({
        aggs: {
          aggs: [aggCount, aggAverage],
          bySchemaName: () => [aggCount, aggAverage],
        },
        aggsLabels: `${aggCount.makeLabel()}, ${aggAverage.makeLabel()}`,
      });

      const updatedSeries = [
        seriesParam,
        { ...seriesParam, data: { id: '2', label: aggAverage.makeLabel() } },
      ];
      expect(setValue).toHaveBeenLastCalledWith('seriesParams', updatedSeries);
    });

    it('should update series when new agg label is changed', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: aggCount.id, makeLabel: () => 'New label' };
      comp.setProps({
        aggs: {
          aggs: [agg],
          bySchemaName: () => [agg],
        },
      });

      const updatedSeries = [{ ...seriesParam, data: { id: agg.id, label: agg.makeLabel() } }];
      expect(setValue).toHaveBeenLastCalledWith('seriesParams', updatedSeries);
    });

    it('should update visType when one seriesParam', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      expect(defaultProps.vis.type.type).toBe(ChartTypes.AREA);

      comp.setProps({
        stateParams: {
          ...defaultProps.stateParams,
          seriesParams: [{ ...seriesParam, type: ChartTypes.LINE }],
        },
      });

      expect(setVisType).toHaveBeenLastCalledWith(ChartTypes.LINE);
    });

    it('should set histogram visType when multiple seriesParam', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      expect(defaultProps.vis.type.type).toBe(ChartTypes.AREA);

      comp.setProps({
        stateParams: {
          ...defaultProps.stateParams,
          seriesParams: [seriesParam, { ...seriesParam, type: ChartTypes.LINE }],
        },
      });

      expect(setVisType).toHaveBeenLastCalledWith(ChartTypes.HISTOGRAM);
    });
  });

  describe('updateAxisTitle', () => {
    it('should not update the value axis title if custom title was set', () => {
      defaultProps.stateParams.valueAxes[0].title.text = 'Custom title';
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);

      const newAgg = {
        id: '1',
        makeLabel: () => 'Max',
      };
      comp.setProps({
        aggs: {
          aggs: [newAgg],
          bySchemaName: () => [newAgg],
        },
        aggsLabels: `${newAgg.makeLabel()}`,
      });
      expect(setValue).not.toHaveBeenCalledWith('valueAxes');
    });

    it('should set the custom title to match the value axis label when only one agg exists for that axis', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = {
        id: aggCount.id,
        params: { customLabel: 'Custom label' },
        makeLabel: () => 'Custom label',
      };
      comp.setProps({
        aggs: {
          aggs: [agg],
          bySchemaName: () => [agg],
        },
        aggsLabels: agg.makeLabel(),
      });

      const updatedValues = [{ ...axis, title: { text: 'Custom label' } }];
      expect(setValue).toHaveBeenCalledWith('valueAxes', updatedValues);
    });

    it('should not set the custom title to match the value axis label when more than one agg exists for that axis', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: aggCount.id, makeLabel: () => 'Custom label' };
      comp.setProps({
        aggs: {
          aggs: [agg, aggAverage],
          bySchemaName: () => [agg, aggAverage],
        },
        aggsLabels: `${agg.makeLabel()}, ${aggAverage.makeLabel()}`,
        stateParams: {
          ...defaultProps.stateParams,
          seriesParams: [seriesParam, seriesParam],
        },
      });

      expect(setValue).not.toHaveBeenCalledWith('valueAxes');
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
        aggs: {
          aggs: [agg],
          bySchemaName: () => [agg],
        },
        aggsLabels: agg.makeLabel(),
      });

      expect(setValue).not.toHaveBeenCalledWith('valueAxes');
    });

    it('should overwrite the custom title when the agg type changes', () => {
      defaultProps.stateParams.valueAxes[0].title.text = 'Custom title';
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = {
        id: aggCount.id,
        type: { name: 'max' },
        makeLabel: () => 'Max',
      };
      comp.setProps({
        aggs: {
          aggs: [agg],
          bySchemaName: () => [agg],
        },
        aggsLabels: agg.makeLabel(),
      });

      const updatedValues = [{ ...axis, title: { text: 'Max' } }];
      expect(setValue).toHaveBeenCalledWith('valueAxes', updatedValues);
    });

    it('should overwrite the custom title when the agg field changes', () => {
      defaultProps.stateParams.valueAxes[0].title.text = 'Custom title';
      const agg = {
        id: aggCount.id,
        type: { name: 'max' },
        makeLabel: () => 'Max',
      } as AggConfig;
      defaultProps.aggs = {
        aggs: [agg],
        bySchemaName: () => [agg],
      } as any;
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      agg.params = { field: { name: 'Field' } };
      agg.makeLabel = () => 'Max, Field';
      comp.setProps({
        aggs: {
          aggs: [agg],
          bySchemaName: () => [agg],
        },
        aggsLabels: agg.makeLabel(),
      });

      const updatedValues = [{ ...axis, title: { text: 'Max, Field' } }];
      expect(setValue).toHaveBeenCalledWith('valueAxes', updatedValues);
    });
  });

  it('should add value axis', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
    act(() => {
      comp.find(ValueAxesPanel).prop('addValueAxis')();
    });

    expect(setValue).toHaveBeenCalledWith('valueAxes', [axis, axisRight]);
  });

  describe('removeValueAxis', () => {
    beforeEach(() => {
      defaultProps.stateParams.valueAxes = [axis, axisRight];
    });

    it('should remove value axis', () => {
      const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
      act(() => {
        comp.find(ValueAxesPanel).prop('removeValueAxis')(axis);
      });

      expect(setValue).toHaveBeenCalledWith('valueAxes', [axisRight]);
    });

    it('should update seriesParams "valueAxis" prop', () => {
      const updatedSeriesParam = { ...seriesParam, valueAxis: 'ValueAxis-2' };
      const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
      act(() => {
        comp.find(ValueAxesPanel).prop('removeValueAxis')(axis);
      });

      expect(setValue).toHaveBeenCalledWith('seriesParams', [updatedSeriesParam]);
    });

    it('should reset grid "valueAxis" prop', () => {
      const updatedGrid = { valueAxis: undefined };
      defaultProps.stateParams.seriesParams[0].valueAxis = 'ValueAxis-2';
      const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
      act(() => {
        comp.find(ValueAxesPanel).prop('removeValueAxis')(axis);
      });

      expect(setValue).toHaveBeenCalledWith('grid', updatedGrid);
    });
  });

  it('should update axis value when when category position chnaged', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
    act(() => {
      comp.find(CategoryAxisPanel).prop('onPositionChanged')(Positions.LEFT);
    });

    const updatedValues = [{ ...axis, name: 'BottomAxis-1', position: Positions.BOTTOM }];
    expect(setValue).toHaveBeenCalledWith('valueAxes', updatedValues);
  });
});
