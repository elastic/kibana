import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCardGroup,
} from './card_group';

test('renders KuiCardGroup', () => {
  const component = <KuiCardGroup {...requiredProps}>children</KuiCardGroup>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiCardGroup isUnited', () => {
  const component = <KuiCardGroup isUnited {...requiredProps}>children</KuiCardGroup>;
  expect(render(component)).toMatchSnapshot();
});
