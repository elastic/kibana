import React from 'react';
import { shallow } from 'enzyme';
import { AddData } from './add_data';

test('render', () => {
  const component = shallow(<AddData
    apmUiEnabled={false}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('apmUiEnabled', () => {
  const component = shallow(<AddData
    apmUiEnabled={true}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
