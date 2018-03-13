import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryItemImage,
} from './gallery_item_image';

test('renders KuiGalleryItemImage', () => {
  const component = <KuiGalleryItemImage {...requiredProps}>children</KuiGalleryItemImage>;
  expect(render(component)).toMatchSnapshot();
});
