import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryButtonIcon,
} from './gallery_button_icon';

test('renders KuiGalleryButtonIcon', () => {
  const component = <KuiGalleryButtonIcon {...requiredProps}>children</KuiGalleryButtonIcon>;
  expect(render(component)).toMatchSnapshot();
});
