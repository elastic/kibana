import React from 'react';
import sinon from 'sinon';
import { shallow } from 'enzyme';

import {
  ListControl,
} from './list_control';

const options = [
  { label: 'choice1', value: 'choice1' },
  { label: 'choice2', value: 'choice2' }
];

let stageFilter;

beforeEach(() => {
  stageFilter = sinon.spy();
});

test('renders ListControl', () => {
  const component = shallow(<ListControl
    id="mock-list-control"
    label="list control"
    options={options}
    selectedOptions={[]}
    multiselect={true}
    controlIndex={0}
    stageFilter={stageFilter}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
