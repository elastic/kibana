import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';

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
let stageFilter;

beforeEach(() => {
  stageFilter = sinon.spy();
});

test('renders RangeControl', () => {
  const component = shallow(<RangeControl
    control={control}
    controlIndex={0}
    stageFilter={stageFilter}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
