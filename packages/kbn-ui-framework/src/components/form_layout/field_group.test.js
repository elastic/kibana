import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiFieldGroup,
} from './field_group';

test('renders KuiFieldGroup', () => {
  const component = <KuiFieldGroup {...requiredProps}>children</KuiFieldGroup>;
  expect(render(component)).toMatchSnapshot();
});

test('renders KuiFieldGroup isAlignedTop', () => {
  const component = <KuiFieldGroup isAlignedTop {...requiredProps}>children</KuiFieldGroup>;
  expect(render(component)).toMatchSnapshot();
});
