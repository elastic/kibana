import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiHeaderBar
} from './header_bar';

test('renders KuiHeaderBar', () => {
  const component = <KuiHeaderBar {...requiredProps}>children</KuiHeaderBar>;
  expect(render(component)).toMatchSnapshot();
});
