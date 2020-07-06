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
import { shallow } from 'enzyme';
import { ValueAxesPanel, ValueAxesPanelProps } from './value_axes_panel';
import { ValueAxis, SeriesParam } from '../../../types';
import { Positions } from '../../../utils/collections';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { valueAxis, seriesParam, vis } from './mocks';

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
      position: Positions.RIGHT,
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
      vis,
      isCategoryAxisHorizontal: false,
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
