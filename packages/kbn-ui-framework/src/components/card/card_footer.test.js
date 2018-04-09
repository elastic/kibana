import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCardFooter,
} from './card_footer';

test('renders KuiCardFooter', () => {
  const component = <KuiCardFooter {...requiredProps}>children</KuiCardFooter>;
  expect(render(component)).toMatchSnapshot();
});
