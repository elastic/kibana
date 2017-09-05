import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryButtonImage,
} from './gallery_button_image';

test('renders KuiGalleryButtonImage', () => {
  const component = <KuiGalleryButtonImage {...requiredProps}>children</KuiGalleryButtonImage>;
  expect(render(component)).toMatchSnapshot();
});
