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
import { LabelOptions, LabelOptionsProps } from './label_options';
import { TruncateLabelsOption } from '../../common';
import { valueAxis } from './mocks';

const FILTER = 'filter';
const ROTATE = 'rotate';
const DISABLED = 'disabled';

describe('LabelOptions component', () => {
  let setAxisLabel: jest.Mock;
  let defaultProps: LabelOptionsProps;

  beforeEach(() => {
    setAxisLabel = jest.fn();

    defaultProps = {
      axisLabels: { ...valueAxis.labels },
      axisFilterCheckboxName: '',
      setAxisLabel,
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should show other fields when axis.labels.show is true', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);

    expect(comp.find({ paramName: FILTER }).prop(DISABLED)).toBeFalsy();
    expect(comp.find({ paramName: ROTATE }).prop(DISABLED)).toBeFalsy();
    expect(comp.find(TruncateLabelsOption).prop(DISABLED)).toBeFalsy();
  });

  it('should disable other fields when axis.labels.show is false', () => {
    defaultProps.axisLabels.show = false;
    const comp = shallow(<LabelOptions {...defaultProps} />);

    expect(comp.find({ paramName: FILTER }).prop(DISABLED)).toBeTruthy();
    expect(comp.find({ paramName: ROTATE }).prop(DISABLED)).toBeTruthy();
    expect(comp.find(TruncateLabelsOption).prop(DISABLED)).toBeTruthy();
  });

  it('should set rotate as number', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);
    comp.find({ paramName: ROTATE }).prop('setValue')(ROTATE, '5');

    expect(setAxisLabel).toBeCalledWith('rotate', 5);
  });

  it('should set filter value', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);
    comp.find({ paramName: FILTER }).prop('setValue')(FILTER, false);

    expect(setAxisLabel).toBeCalledWith(FILTER, false);
  });

  it('should set value for valueAxes', () => {
    const comp = shallow(<LabelOptions {...defaultProps} />);
    comp.find(TruncateLabelsOption).prop('setValue')('truncate', 10);

    expect(setAxisLabel).toBeCalledWith('truncate', 10);
  });
});
