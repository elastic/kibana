import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';

import {
  ListControl,
} from './list_control';

const control = {
  id: 'mock-list-control',
  isEnabled: () => { return true; },
  options: {
    type: 'terms',
    multiselect: true
  },
  type: 'list',
  label: 'list control',
  getMultiSelectDelimiter: () => { return ','; },
  value: '',
  selectOptions: [
    { label: 'choice1', value: 'choice1' },
    { label: 'choice2', value: 'choice2' }
  ]
};
let stageFilter;

beforeEach(() => {
  stageFilter = sinon.spy();
});

test('renders ListControl', () => {
  const component = shallow(<ListControl
    control={control}
    controlIndex={0}
    stageFilter={stageFilter}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
