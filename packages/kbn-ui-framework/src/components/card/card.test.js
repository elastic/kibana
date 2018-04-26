import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCard,
} from './card';

test('renders KuiCard', () => {
  const component = <KuiCard {...requiredProps}>children</KuiCard>;
  expect(render(component)).toMatchSnapshot();
});
