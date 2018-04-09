import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiCardDescriptionText,
} from './card_description_text';

test('renders KuiCardDescriptionText', () => {
  const component = <KuiCardDescriptionText {...requiredProps}>children</KuiCardDescriptionText>;
  expect(render(component)).toMatchSnapshot();
});
