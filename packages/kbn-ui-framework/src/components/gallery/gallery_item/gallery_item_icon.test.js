import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryItemIcon,
} from './gallery_item_icon';

test('renders KuiGalleryItemIcon', () => {
  const component = <KuiGalleryItemIcon {...requiredProps}>children</KuiGalleryItemIcon>;
  expect(render(component)).toMatchSnapshot();
});
