import React from 'react';
import { shallow } from 'enzyme';

import {
  CopyButton,
} from './copy_button';

test('render', () => {
  const component = shallow(<CopyButton
    textToCopy={'text that is copied to clipboard'}
  />);
  expect(component).toMatchSnapshot();
});
