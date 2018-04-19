import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiBarSection,
} from './bar_section';

test('renders KuiBarSection', () => {
  const component = <KuiBarSection {...requiredProps}>children</KuiBarSection>;
  expect(render(component)).toMatchSnapshot();
});
