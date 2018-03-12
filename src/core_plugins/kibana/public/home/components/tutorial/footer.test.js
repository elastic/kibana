import React from 'react';
import { shallow } from 'enzyme';

import {
  Footer,
} from './footer';

test('render', () => {
  const component = shallow(<Footer/>);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {
  test('url', () => {
    const component = shallow(<Footer
      url={'/app/myapp'}
      label={'launch myapp'}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
