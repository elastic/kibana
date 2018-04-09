import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiMenu,
} from './menu';

test('renders KuiMenu', () => {
  const component = <KuiMenu {...requiredProps}>children</KuiMenu>;
  expect(render(component)).toMatchSnapshot();
});

test('contained prop', () => {
  const component = <KuiMenu contained >children</KuiMenu>;
  expect(render(component)).toMatchSnapshot();
});
