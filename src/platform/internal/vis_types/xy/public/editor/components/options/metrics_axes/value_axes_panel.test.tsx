/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { mountWithIntl } from '@kbn/test-jest-helpers';
import { Position } from '@elastic/charts';

import { ValueAxis, SeriesParam } from '../../../../types';
import { ValueAxesPanel, ValueAxesPanelProps } from './value_axes_panel';
import { valueAxis, seriesParam } from './mocks';

describe('ValueAxesPanel component', () => {
  let setParamByIndex: jest.Mock;
  let onValueAxisPositionChanged: jest.Mock;
  let setMultipleValidity: jest.Mock;
  let addValueAxis: jest.Mock;
  let removeValueAxis: jest.Mock;
  let defaultProps: ValueAxesPanelProps;
  let axisLeft: ValueAxis;
  let axisRight: ValueAxis;
  let seriesParamCount: SeriesParam;
  let seriesParamAverage: SeriesParam;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    onValueAxisPositionChanged = jest.fn();
    addValueAxis = jest.fn();
    removeValueAxis = jest.fn();
    setMultipleValidity = jest.fn();
    axisLeft = { ...valueAxis };
    axisRight = {
      ...valueAxis,
      id: 'ValueAxis-2',
      position: Position.Right,
    };
    seriesParamCount = { ...seriesParam };
    seriesParamAverage = {
      ...seriesParam,
      valueAxis: 'ValueAxis-2',
      data: {
        label: 'Average',
        id: '1',
      },
    };

    defaultProps = {
      seriesParams: [seriesParamCount, seriesParamAverage],
      valueAxes: [axisLeft, axisRight],
      setParamByIndex,
      onValueAxisPositionChanged,
      addValueAxis,
      removeValueAxis,
      setMultipleValidity,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<ValueAxesPanel {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should not allow to remove the last value axis', () => {
    defaultProps.valueAxes = [axisLeft];
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    expect(comp.find('[data-test-subj="removeValueAxisBtn"] button').exists()).toBeFalsy();
  });

  it('should display remove button when multiple axes', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);

    expect(comp.find('[data-test-subj="removeValueAxisBtn"] button').exists()).toBeTruthy();
  });

  it('should call removeAgg', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    comp.find('[data-test-subj="removeValueAxisBtn"] button').first().simulate('click');

    expect(removeValueAxis).toBeCalledWith(axisLeft);
  });

  it('should call addValueAxis', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    comp.find('[data-test-subj="visualizeAddYAxisButton"] button').simulate('click');

    expect(addValueAxis).toBeCalled();
  });

  describe('description', () => {
    it('should show when one serie matches value axis', () => {
      const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
      expect(
        comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').first().text()
      ).toBe(seriesParamCount.data.label);
    });

    it('should show when multiple series match value axis', () => {
      defaultProps.seriesParams[1].valueAxis = 'ValueAxis-1';
      const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
      expect(
        comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').first().text()
      ).toBe(`${seriesParamCount.data.label}, ${seriesParamAverage.data.label}`);
    });

    it('should not show when no series match value axis', () => {
      defaultProps.seriesParams[0].valueAxis = 'ValueAxis-2';
      const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
      expect(
        comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').first().text()
      ).toBe('');
    });
  });
});
