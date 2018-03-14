import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../../test/required_props';

import {
  KuiGalleryItemLabel,
} from './gallery_item_label';

test('renders KuiGalleryItemLabel', () => {
  const component = <KuiGalleryItemLabel {...requiredProps}>children</KuiGalleryItemLabel>;
  expect(render(component)).toMatchSnapshot();
});
