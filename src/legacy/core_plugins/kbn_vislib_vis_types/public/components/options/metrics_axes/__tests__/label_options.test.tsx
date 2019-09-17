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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { LabelOptions, LabelOptionsProps } from '../label_options';
import { Axis } from '../../../../types';
import { TruncateLabelsOption } from '../../../common';

describe('LabelOptions component', () => {
  let setValue: jest.Mock;
  let defaultProps: LabelOptionsProps;
  let axis: Axis;
  const filterParamName = 'filter';
  const rotateParamName = 'rotate';

  beforeEach(() => {
    setValue = jest.fn();
    axis = {
      labels: {
        show: true,
        filter: false,
        truncate: 0,
      },
    } as Axis;

    defaultProps = {
      axis,
      axesName: 'categoryAxes',
      index: 0,
      stateParams: {
        categoryAxes: [axis],
        valueAxes: [axis],
      } as any,
      setValue,
    } as any;
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should show other fields when axis.labels.show is true', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);

    expect(comp.find({ paramName: filterParamName }).prop('disabled')).toBeFalsy();
    expect(comp.find({ paramName: rotateParamName }).prop('disabled')).toBeFalsy();
    expect(comp.find(TruncateLabelsOption).prop('disabled')).toBeFalsy();
  });

  it('should disable other fields when axis.labels.show is false', () => {
    defaultProps.axis.labels.show = false;
    const comp = shallow(<LabelOptions {...defaultProps} />);

    expect(comp.find({ paramName: filterParamName }).prop('disabled')).toBeTruthy();
    expect(comp.find({ paramName: rotateParamName }).prop('disabled')).toBeTruthy();
    expect(comp.find(TruncateLabelsOption).prop('disabled')).toBeTruthy();
  });

  it('should set rotate as number', () => {
    const comp = mountWithIntl(<LabelOptions {...defaultProps} />);
    act(() => {
      comp.find({ paramName: rotateParamName }).prop('setValue')(rotateParamName, '5');
    });

    const newAxes = [{ ...axis, labels: { ...axis.labels, rotate: 5 } }];
    expect(setValue).toBeCalledWith('categoryAxes', newAxes);
  });

  it('should set filter value', () => {
    const comp = mountWithIntl(<LabelOptions {...defaultProps} />);
    expect(defaultProps.stateParams.categoryAxes[0].labels.filter).toBeFalsy();
    act(() => {
      comp.find({ paramName: filterParamName }).prop('setValue')(filterParamName, true);
    });

    const newAxes = [{ ...axis, labels: { ...axis.labels, filter: true } }];
    expect(setValue).toBeCalledWith('categoryAxes', newAxes);
  });

  it('should set value for valueAxes', () => {
    defaultProps.axesName = 'valueAxes';
    const comp = shallow(<LabelOptions {...defaultProps} />);
    act(() => {
      comp.find(TruncateLabelsOption).prop('setValue')('truncate', 10);
    });

    const newAxes = [{ ...axis, labels: { ...axis.labels, truncate: 10 } }];
    expect(setValue).toBeCalledWith('valueAxes', newAxes);
  });
});
