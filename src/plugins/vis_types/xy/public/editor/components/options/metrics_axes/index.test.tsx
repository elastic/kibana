/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { Position } from '@elastic/charts';

import { IAggConfig, IAggType } from '@kbn/data-plugin/public';

import { ChartType } from '../../../../../common';
import { VisParams, SeriesParam, ValueAxis } from '../../../../types';
import MetricsAxisOptions from '.';
import { ValidationVisOptionsProps } from '../../common';
import { ValueAxesPanel } from './value_axes_panel';
import { CategoryAxisPanel } from './category_axis_panel';
import { defaultValueAxisId, valueAxis, seriesParam, categoryAxis } from './mocks';
import { mapPosition, mapPositionOpposite } from './utils';

jest.mock('./series_panel', () => ({
  SeriesPanel: () => 'SeriesPanel',
}));
jest.mock('./category_axis_panel', () => ({
  CategoryAxisPanel: () => 'CategoryAxisPanel',
}));
jest.mock('./value_axes_panel', () => ({
  ValueAxesPanel: () => 'ValueAxesPanel',
}));
jest.mock('../../../../services', () => ({
  getUISettings: jest.fn(() => ({
    get: jest.fn((key: string, defaultOverride?: unknown) => defaultOverride),
  })),
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
  let defaultProps: ValidationVisOptionsProps<VisParams>;
  let axis: ValueAxis;
  let axisRight: ValueAxis;
  let chart: SeriesParam;

  beforeEach(() => {
    setValue = jest.fn();

    axis = {
      ...valueAxis,
      name: 'LeftAxis-1',
      position: Position.Left,
    };
    axisRight = {
      ...valueAxis,
      id: 'ValueAxis-2',
      name: 'RightAxis-1',
      position: Position.Right,
    };
    chart = {
      ...seriesParam,
      type: ChartType.Area,
    };

    defaultProps = {
      aggs: createAggs([aggCount]),
      isTabSelected: true,
      vis: {
        type: {
          type: ChartType.Area,
          schemas: { metrics: [{ name: 'metric' }] },
        },
        setState: jest.fn(),
        serialize: jest.fn(),
      },
      stateParams: {
        valueAxes: [axis],
        seriesParams: [chart],
        categoryAxes: [categoryAxis],
        grid: {
          valueAxis: defaultValueAxisId,
        },
      },
      setValue,
    } as any;
  });

  it('should init with the default set of props', () => {
    const component = shallow(<MetricsAxisOptions {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  describe('useEffect', () => {
    it('should update series when new agg is added', () => {
      const component = mount(<MetricsAxisOptions {...defaultProps} />);
      component.setProps({
        aggs: createAggs([aggCount, aggAverage]),
      });

      const updatedSeries = [chart, { ...chart, data: { id: '2', label: aggAverage.makeLabel() } }];
      expect(setValue).toHaveBeenLastCalledWith(SERIES_PARAMS, updatedSeries);
    });

    it('should update series when new agg label is changed', () => {
      const component = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: aggCount.id, makeLabel: () => 'New label' };
      component.setProps({
        aggs: createAggs([agg]),
      });

      const updatedSeries = [{ ...chart, data: { id: agg.id, label: agg.makeLabel() } }];
      expect(setValue).toHaveBeenCalledWith(SERIES_PARAMS, updatedSeries);
    });
  });

  describe('updateAxisTitle', () => {
    it('should not update the value axis title if custom title was set', () => {
      defaultProps.stateParams.valueAxes[0].title.text = 'Custom title';
      const component = mount(<MetricsAxisOptions {...defaultProps} />);
      const newAgg = {
        ...aggCount,
        makeLabel: () => 'Custom label',
      };
      component.setProps({
        aggs: createAggs([newAgg]),
      });
      const updatedValues = [{ ...axis, title: { text: newAgg.makeLabel() } }];
      expect(setValue).not.toHaveBeenCalledWith(VALUE_AXES, updatedValues);
    });

    it('should set the custom title to match the value axis label when only one agg exists for that axis', () => {
      const component = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = {
        id: aggCount.id,
        params: { customLabel: 'Custom label' },
        makeLabel: () => 'Custom label',
      };
      component.setProps({
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
      const component = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = { id: aggCount.id, makeLabel: () => 'Custom label' };
      component.setProps({
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
      const component = mount(<MetricsAxisOptions {...defaultProps} />);
      const agg = {
        id: aggCount.id,
        params: { customLabel: 'Custom label' },
        makeLabel: () => 'Custom label',
      };
      component.setProps({
        aggs: createAggs([agg]),
      });

      expect(setValue).not.toHaveBeenCalledWith(VALUE_AXES);
    });
  });

  it('should add value axis', () => {
    const component = shallow(<MetricsAxisOptions {...defaultProps} />);
    component.find(ValueAxesPanel).prop('addValueAxis')();

    expect(setValue).toHaveBeenCalledWith(VALUE_AXES, [axis, axisRight]);
  });

  describe('removeValueAxis', () => {
    beforeEach(() => {
      defaultProps.stateParams.valueAxes = [axis, axisRight];
    });

    it('should remove value axis', () => {
      const component = shallow(<MetricsAxisOptions {...defaultProps} />);
      component.find(ValueAxesPanel).prop('removeValueAxis')(axis);

      expect(setValue).toHaveBeenCalledWith(VALUE_AXES, [axisRight]);
    });

    it('should update seriesParams "valueAxis" prop', () => {
      const updatedSeriesParam = { ...chart, valueAxis: 'ValueAxis-2' };
      const component = shallow(<MetricsAxisOptions {...defaultProps} />);
      component.find(ValueAxesPanel).prop('removeValueAxis')(axis);

      expect(setValue).toHaveBeenCalledWith(SERIES_PARAMS, [updatedSeriesParam]);
    });

    it('should reset grid "valueAxis" prop', () => {
      const updatedGrid = { valueAxis: undefined };
      defaultProps.stateParams.seriesParams[0].valueAxis = 'ValueAxis-2';
      const component = shallow(<MetricsAxisOptions {...defaultProps} />);
      component.find(ValueAxesPanel).prop('removeValueAxis')(axis);

      expect(setValue).toHaveBeenCalledWith('grid', updatedGrid);
    });
  });

  describe('onValueAxisPositionChanged', () => {
    const getProps = (
      valuePosition1: Position = Position.Right,
      valuePosition2: Position = Position.Left
    ): ValidationVisOptionsProps<VisParams> => ({
      ...defaultProps,
      stateParams: {
        ...defaultProps.stateParams,
        valueAxes: [
          {
            ...valueAxis,
            id: 'ValueAxis-1',
            position: valuePosition1,
          },
          {
            ...valueAxis,
            id: 'ValueAxis-2',
            position: valuePosition2,
          },
          {
            ...valueAxis,
            id: 'ValueAxis-3',
            position: valuePosition2,
          },
        ],
        categoryAxes: [
          {
            ...categoryAxis,
            position: mapPosition(valuePosition1),
          },
        ],
      },
    });

    it('should update all value axes if another value axis changes from horizontal to vertical', () => {
      const component = mount(<MetricsAxisOptions {...getProps()} />);
      setValue.mockClear();
      const onValueAxisPositionChanged = component
        .find(ValueAxesPanel)
        .prop('onValueAxisPositionChanged');
      onValueAxisPositionChanged(0, Position.Bottom);
      expect(setValue).nthCalledWith(1, 'categoryAxes', [
        expect.objectContaining({
          id: 'CategoryAxis-1',
          position: Position.Right,
        }),
      ]);
      expect(setValue).nthCalledWith(2, 'valueAxes', [
        expect.objectContaining({
          id: 'ValueAxis-1',
          position: Position.Bottom,
        }),
        expect.objectContaining({
          id: 'ValueAxis-2',
          position: Position.Top,
        }),
        expect.objectContaining({
          id: 'ValueAxis-3',
          position: Position.Top,
        }),
      ]);
    });

    it('should update all value axes if another value axis changes from vertical to horizontal', () => {
      const component = mount(<MetricsAxisOptions {...getProps(Position.Top, Position.Bottom)} />);
      setValue.mockClear();
      const onValueAxisPositionChanged = component
        .find(ValueAxesPanel)
        .prop('onValueAxisPositionChanged');
      onValueAxisPositionChanged(1, Position.Left);
      expect(setValue).nthCalledWith(1, 'categoryAxes', [
        expect.objectContaining({
          id: 'CategoryAxis-1',
          position: Position.Top,
        }),
      ]);
      expect(setValue).nthCalledWith(2, 'valueAxes', [
        expect.objectContaining({
          id: 'ValueAxis-1',
          position: Position.Right,
        }),
        expect.objectContaining({
          id: 'ValueAxis-2',
          position: Position.Left,
        }),
        expect.objectContaining({
          id: 'ValueAxis-3',
          position: Position.Left,
        }),
      ]);
    });

    it('should update only changed value axis if value axis stays horizontal', () => {
      const component = mount(<MetricsAxisOptions {...getProps()} />);
      setValue.mockClear();
      const onValueAxisPositionChanged = component
        .find(ValueAxesPanel)
        .prop('onValueAxisPositionChanged');
      onValueAxisPositionChanged(0, Position.Left);
      expect(setValue).nthCalledWith(1, 'valueAxes', [
        expect.objectContaining({
          id: 'ValueAxis-1',
          position: Position.Left,
        }),
        expect.objectContaining({
          id: 'ValueAxis-2',
          position: Position.Left,
        }),
        expect.objectContaining({
          id: 'ValueAxis-3',
          position: Position.Left,
        }),
      ]);
    });

    it('should update only changed value axis if value axis stays vertical', () => {
      const component = mount(<MetricsAxisOptions {...getProps(Position.Top, Position.Bottom)} />);
      setValue.mockClear();
      const onValueAxisPositionChanged = component
        .find(ValueAxesPanel)
        .prop('onValueAxisPositionChanged');
      onValueAxisPositionChanged(1, Position.Top);
      expect(setValue).nthCalledWith(1, 'valueAxes', [
        expect.objectContaining({
          id: 'ValueAxis-1',
          position: Position.Top,
        }),
        expect.objectContaining({
          id: 'ValueAxis-2',
          position: Position.Top,
        }),
        expect.objectContaining({
          id: 'ValueAxis-3',
          position: Position.Bottom,
        }),
      ]);
    });
  });

  describe('onCategoryAxisPositionChanged', () => {
    const getProps = (
      position: Position = Position.Bottom
    ): ValidationVisOptionsProps<VisParams> => ({
      ...defaultProps,
      stateParams: {
        ...defaultProps.stateParams,
        valueAxes: [
          {
            ...valueAxis,
            id: 'ValueAxis-1',
            position: mapPosition(position),
          },
          {
            ...valueAxis,
            id: 'ValueAxis-2',
            position: mapPositionOpposite(mapPosition(position)),
          },
          {
            ...valueAxis,
            id: 'ValueAxis-3',
            position: mapPosition(position),
          },
        ],
        categoryAxes: [
          {
            ...categoryAxis,
            position,
          },
        ],
      },
    });

    it('should update all value axes if category axis changes from horizontal to vertical', () => {
      const component = mount(<MetricsAxisOptions {...getProps()} />);
      setValue.mockClear();
      const onPositionChanged = component.find(CategoryAxisPanel).prop('onPositionChanged');
      onPositionChanged(Position.Left);
      expect(setValue).nthCalledWith(1, 'valueAxes', [
        expect.objectContaining({
          id: 'ValueAxis-1',
          position: Position.Bottom,
        }),
        expect.objectContaining({
          id: 'ValueAxis-2',
          position: Position.Top,
        }),
        expect.objectContaining({
          id: 'ValueAxis-3',
          position: Position.Bottom,
        }),
      ]);
    });

    it('should update all value axes if category axis changes from vertical to horizontal', () => {
      const component = mount(<MetricsAxisOptions {...getProps(Position.Left)} />);
      setValue.mockClear();
      const onPositionChanged = component.find(CategoryAxisPanel).prop('onPositionChanged');
      onPositionChanged(Position.Top);
      expect(setValue).nthCalledWith(1, 'valueAxes', [
        expect.objectContaining({
          id: 'ValueAxis-1',
          position: Position.Left,
        }),
        expect.objectContaining({
          id: 'ValueAxis-2',
          position: Position.Right,
        }),
        expect.objectContaining({
          id: 'ValueAxis-3',
          position: Position.Left,
        }),
      ]);
    });

    it('should not update value axes if category axis stays horizontal', () => {
      const component = mount(<MetricsAxisOptions {...getProps()} />);
      setValue.mockClear();
      const onPositionChanged = component.find(CategoryAxisPanel).prop('onPositionChanged');
      onPositionChanged(Position.Top);
      expect(setValue).not.toBeCalled();
    });

    it('should not update value axes if category axis stays vertical', () => {
      const component = mount(<MetricsAxisOptions {...getProps(Position.Left)} />);
      setValue.mockClear();
      const onPositionChanged = component.find(CategoryAxisPanel).prop('onPositionChanged');
      onPositionChanged(Position.Right);
      expect(setValue).not.toBeCalled();
    });
  });
});
