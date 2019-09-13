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

import { ChartTypes, ChartModes, InterpolationModes } from '../../../../utils/collections';
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
  let setMultipleValidity: jest.Mock;
  let setValue: jest.Mock;
  let setVisType: jest.Mock;
  let defaultProps: ValidationVisOptionsProps<BasicVislibParams>;
  let aggs;
  const agg1 = {
    id: '1',
    makeLabel: () => 'Count',
  } as AggConfig;
  const agg2 = {
    id: '2',
    makeLabel: () => 'Average',
  } as AggConfig;
  const chart = {
    show: true,
    mode: ChartModes.STACKED,
    data: {
      label: 'Count',
      id: '1',
    },
    drawLinesBetweenPoints: true,
    lineWidth: 2,
    showCircles: true,
    interpolate: InterpolationModes.LINEAR,
    valueAxis: 'ValueAxis-1',
  } as SeriesParam;
  const axis = {
    id: 'ValueAxis-1',
    name: 'ValueAxis-1',
    position: Positions.LEFT,
    title: {},
  } as ValueAxis;

  const seriesParam = {
    type: ChartTypes.AREA,
    data: {
      label: 'Count',
      id: '1',
    },
    valueAxis: 'ValueAxis-1',
  };

  beforeEach(() => {
    setMultipleValidity = jest.fn();
    setValue = jest.fn();
    setVisType = jest.fn();

    aggs = {
      aggs: [agg1],
      bySchemaName: () => [agg1],
    };

    chart.type = ChartTypes.HISTOGRAM;

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
      },
      setMultipleValidity,
      setValue,
      setVisType,
    } as any;
  });

  it.skip('should init with the default set of props', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  describe('useEffect', () => {
    it('should update series when new agg is added', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      comp.setProps({
        aggs: {
          aggs: [agg1, agg2],
          bySchemaName: () => [agg1, agg2],
        },
        aggsLabels: `${agg1.makeLabel()}, ${agg2.makeLabel()}`,
      });

      const updatedSeries = [
        seriesParam,
        { ...seriesParam, data: { id: '2', label: agg2.makeLabel() } },
      ];
      expect(setValue).toHaveBeenLastCalledWith('seriesParams', updatedSeries);
    });

    it('should update series when new agg label is changed', () => {
      const comp = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: agg1.id, makeLabel: () => 'New label' };
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

    it('should update visType when multiple seriesParam', () => {
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

    describe('updateAxisTitle', () => {
      // it('should set the value axis title if its not set', () => {});
      // it('should not update the value axis title if custom title was set', () => {});
      // it('should set the custom title to match the value axis label when only one agg exists for that axis', () => {});
      // it('should not set the custom title to match the value axis label when more than one agg exists for that axis', () => {});
      // it('should not overwrite the custom title with the value axis label if the custom title has been changed', () => {});
      // it('should overwrite the custom title when the agg type changes', () => {});
    });
  });

  it('should add value axis', () => {
    const comp = shallow(<MetricsAxisOptions {...defaultProps} />);
    act(() => {
      comp.find(ValueAxesPanel).prop('addValueAxis')();
    });

    const createdAxis = { id: 'ValueAxis-2', name: 'RightAxis-1', position: 'right', title: {} };
    expect(setValue).toHaveBeenCalledWith('valueAxes', [axis, createdAxis]);
  });

  // it('should remove value axis', () => {});

  // it('should not allow to remove the last value axis', () => {});
});
