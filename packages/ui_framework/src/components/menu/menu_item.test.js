import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiMenuItem,
} from './menu_item';

test('renders KuiMenuItem', () => {
  const component = <KuiMenuItem {...requiredProps}>children</KuiMenuItem>;
  expect(render(component)).toMatchSnapshot();
});
