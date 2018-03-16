import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiGallery,
} from './gallery';

test('renders KuiGallery', () => {
  const component = <KuiGallery {...requiredProps}>children</KuiGallery>;
  expect(render(component)).toMatchSnapshot();
});
