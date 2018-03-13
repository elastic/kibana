import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiEventBodyMessage,
} from './event_body_message';

test('renders KuiEventBodyMessage', () => {
  const component = <KuiEventBodyMessage {...requiredProps}>children</KuiEventBodyMessage>;
  expect(render(component)).toMatchSnapshot();
});
