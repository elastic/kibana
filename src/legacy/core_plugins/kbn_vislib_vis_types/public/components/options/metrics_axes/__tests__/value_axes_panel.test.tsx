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
import { ValueAxesPanel, ValueAxesPanelProps } from '../value_axes_panel';
import { ValueAxis, SeriesParam } from '../../../../types';
import {
  ScaleTypes,
  Positions,
  AxisModes,
  scaleTypes,
  axisModes,
  positions,
} from '../../../../utils/collections';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

describe('ValueAxesPanel component', () => {
  let setParamByIndex: jest.Mock;
  let onValueAxisPositionChanged: jest.Mock;
  let addValueAxis: jest.Mock;
  let removeValueAxis: jest.Mock;
  let defaultProps: ValueAxesPanelProps;
  const axis1 = {
    id: 'ValueAxis-1',
    position: Positions.LEFT,
    scale: {
      mode: AxisModes.NORMAL,
      type: ScaleTypes.LINEAR,
    },
    title: {},
    show: true,
    labels: {
      show: true,
      filter: false,
      truncate: 0,
    },
  } as ValueAxis;
  const axis2 = {
    id: 'ValueAxis-2',
    position: Positions.LEFT,
    scale: {
      mode: AxisModes.NORMAL,
      type: ScaleTypes.LINEAR,
    },
    title: {},
    show: true,
    labels: {
      show: true,
      filter: false,
      truncate: 0,
    },
  } as ValueAxis;
  const seriesParam1 = {
    data: {
      label: 'Count',
      id: '1',
    },
  } as SeriesParam;
  const seriesParam2 = {
    data: {
      label: 'Average',
      id: '1',
    },
  } as SeriesParam;

  beforeEach(() => {
    seriesParam1.valueAxis = 'ValueAxis-1';
    seriesParam2.valueAxis = 'ValueAxis-2';
    setParamByIndex = jest.fn();
    onValueAxisPositionChanged = jest.fn();
    addValueAxis = jest.fn();
    removeValueAxis = jest.fn();

    defaultProps = {
      stateParams: {
        seriesParams: [seriesParam1, seriesParam2],
        valueAxes: [axis1, axis2],
      } as any,
      vis: {
        type: {
          editorConfig: {
            collections: { scaleTypes, axisModes, positions },
          },
        },
      },
      isCategoryAxisHorizontal: false,
      setParamByIndex,
      onValueAxisPositionChanged,
      addValueAxis,
      removeValueAxis,
    } as any;
  });

  afterEach(() => {
    setParamByIndex.mockClear();
    onValueAxisPositionChanged.mockClear();
    addValueAxis.mockClear();
    removeValueAxis.mockClear();
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<ValueAxesPanel {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should not allow to remove the last value axis', () => {
    defaultProps.stateParams.valueAxes = [axis1];
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    expect(comp.find('[data-test-subj="removeValueAxisBtn"] button').exists()).toBeFalsy();
  });

  it('should display remove button when multiple axes', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);

    expect(comp.find('[data-test-subj="removeValueAxisBtn"] button').exists()).toBeTruthy();
  });

  it('should call removeAgg', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    comp
      .find('[data-test-subj="removeValueAxisBtn"] button')
      .first()
      .simulate('click');

    expect(removeValueAxis).toBeCalledWith(axis1);
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
        comp
          .find('.visEditorSidebar__aggGroupAccordionButtonContent span')
          .first()
          .text()
      ).toBe('Count');
    });

    it('should show when multiple series match value axis', () => {
      defaultProps.stateParams.seriesParams[1].valueAxis = 'ValueAxis-1';
      const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
      expect(
        comp
          .find('.visEditorSidebar__aggGroupAccordionButtonContent span')
          .first()
          .text()
      ).toBe('Count, Average');
    });

    it('should not show when no series match value axis', () => {
      defaultProps.stateParams.seriesParams[0].valueAxis = 'ValueAxis-2';
      const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
      expect(
        comp
          .find('.visEditorSidebar__aggGroupAccordionButtonContent span')
          .first()
          .text()
      ).toBe('');
    });
  });
});
