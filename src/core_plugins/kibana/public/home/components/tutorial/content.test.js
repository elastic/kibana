import React from 'react';
import { shallow } from 'enzyme';

import {
  Content,
} from './content';

test('should render content with markdown', () => {
  const component = shallow(<Content
    text={'I am *some* [content](https://en.wikipedia.org/wiki/Content) with `markdown`'}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});
