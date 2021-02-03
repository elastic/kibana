/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
