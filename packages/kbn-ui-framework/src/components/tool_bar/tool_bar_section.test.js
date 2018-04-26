import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiToolBarSection,
} from './tool_bar_section';

test('renders KuiToolBarSection', () => {
  const component = <KuiToolBarSection {...requiredProps}>children</KuiToolBarSection>;
  expect(render(component)).toMatchSnapshot();
});
