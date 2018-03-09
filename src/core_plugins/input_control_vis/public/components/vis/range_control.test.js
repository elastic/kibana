import React from 'react';
import { shallow, mount } from 'enzyme';
import { findTestSubject } from '@elastic/eui/lib/test';

import {
  RangeControl,
} from './range_control';

const control = {
  id: 'mock-range-control',
  isEnabled: () => { return true; },
  options: {
    decimalPlaces: 0,
    step: 1
  },
  type: 'range',
  label: 'range control',
  value: { min: 0, max: 0 },
  min: 0,
  max: 100,
  hasValue: () => {
    return false;
  }
};

test('renders RangeControl', () => {
  const component = shallow(<RangeControl
    control={control}
    controlIndex={0}
    stageFilter={() => {}}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('min and max input values', () => {
  const component = mount(<RangeControl
    control={control}
    controlIndex={0}
    stageFilter={() => {}}
  />);

  const BOTH_MIN_AND_MAX_MUST_BE_SET_ERROR = 'both min and max must be set';

  const getMinInput = () => findTestSubject(component, 'rangeControlMinInputValue');
  const getMaxInput = () => findTestSubject(component, 'rangeControlMaxInputValue');
  const getRangeRow = () => findTestSubject(component, 'rangeControlFormRow');

  test('are initially blank', () => {
    expect(getMinInput().props().value).toBe('');
    expect(getMaxInput().props().value).toBe('');
  });

  test('min can be set manually', () => {
    getMinInput().simulate('change', { target: { value: 3 } });
    expect(getMinInput().props().value).toBe(3);
  });

  test('when only min is specified an error is shown', () => {
    expect(getRangeRow().text().indexOf(BOTH_MIN_AND_MAX_MUST_BE_SET_ERROR)).toBeGreaterThan(-1);
  });

  test('max can be set manually', () => {
    getMaxInput().simulate('change', { target: { value: 6 } });
    expect(getMaxInput().props().value).toBe(6);
  });

  test('when both min and max are set there is no error', () => {
    expect(getRangeRow().text().indexOf(BOTH_MIN_AND_MAX_MUST_BE_SET_ERROR)).toBe(-1);
  });

  test('0 is a valid minimum value', () => {
    getMinInput().simulate('change', { target: { value: 0 } });
    expect(getMinInput().props().value).toBe(0);
    expect(getRangeRow().text().indexOf(BOTH_MIN_AND_MAX_MUST_BE_SET_ERROR)).toBe(-1);
  });

  test('min can be deleted and there will be an error shown', () => {
    getMinInput().simulate('change', { target: { value: '' } });
    expect(getMinInput().props().value).toBe('');
    expect(getRangeRow().text().indexOf(BOTH_MIN_AND_MAX_MUST_BE_SET_ERROR)).toBeGreaterThan(-1);
  });

  test('both max and min can be deleted and there will not be an error shown', () => {
    getMaxInput().simulate('change', { target: { value: '' } });
    expect(getMaxInput().props().value).toBe('');
    expect(getRangeRow().text().indexOf(BOTH_MIN_AND_MAX_MUST_BE_SET_ERROR)).toBe(-1);
  });
});


