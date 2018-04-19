import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCardDescriptionTitle,
} from './card_description_title';

test('renders KuiCardDescriptionTitle', () => {
  const component = <KuiCardDescriptionTitle {...requiredProps}>children</KuiCardDescriptionTitle>;
  expect(render(component)).toMatchSnapshot();
});
