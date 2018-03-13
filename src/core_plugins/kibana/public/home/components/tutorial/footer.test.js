import React from 'react';
import { shallow } from 'enzyme';

import {
  Footer,
} from './footer';

test('render', () => {
  const component = shallow(<Footer
    url={'/app/myapp'}
    label={'launch myapp'}
  />);
  expect(component).toMatchSnapshot();
});
