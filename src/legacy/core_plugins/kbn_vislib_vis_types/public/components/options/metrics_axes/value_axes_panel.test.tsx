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
import { ValueAxesPanel, ValueAxesPanelProps } from './value_axes_panel';
import { ValueAxis, SeriesParam } from '../../../types';
import {
  ScaleTypes,
  Positions,
  AxisModes,
  scaleTypes,
  axisModes,
  positions,
} from '../../../utils/collections';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

describe('ValueAxesPanel component', () => {
  let setParamByIndex: jest.Mock;
  let onValueAxisPositionChanged: jest.Mock;
  let addValueAxis: jest.Mock;
  let removeValueAxis: jest.Mock;
  let defaultProps: ValueAxesPanelProps;
  const axis = {
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
  const seriesParam = {
    data: {
      label: 'Count',
      id: '1',
    },
    valueAxis: 'ValueAxis-1',
  } as SeriesParam;

  beforeEach(() => {
    setParamByIndex = jest.fn();
    onValueAxisPositionChanged = jest.fn();
    addValueAxis = jest.fn();
    removeValueAxis = jest.fn();

    defaultProps = {
      axis,
      index: 0,
      stateParams: {
        seriesParams: [seriesParam],
        valueAxes: [axis],
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

  it('should not display remove button when the only axis', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    expect(comp.find('[data-test-subj="removeValueAxisBtn"] button').exists()).toBeFalsy();
  });

  it('should display remove button when multiple axes', () => {
    defaultProps.stateParams.valueAxes = [axis, { ...axis, id: 'ValueAxis-2' }];
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);

    expect(comp.find('[data-test-subj="removeValueAxisBtn"] button').exists()).toBeTruthy();
  });

  it('should call removeAgg', () => {
    defaultProps.stateParams.valueAxes = [axis, { ...axis, id: 'ValueAxis-2' }];
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    comp
      .find('[data-test-subj="removeValueAxisBtn"] button')
      .first()
      .simulate('click');

    expect(removeValueAxis).toBeCalledWith(axis);
  });

  it('should show description when series match value axis', () => {
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    expect(comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').text()).toBe(
      'Count'
    );
  });

  it('should not show description when no series match value axis', () => {
    defaultProps.stateParams.seriesParams[0].valueAxis = '2';
    const comp = mountWithIntl(<ValueAxesPanel {...defaultProps} />);
    expect(comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').text()).toBe('');
  });
});
