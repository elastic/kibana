import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiModal,
} from './modal';

test('renders KuiModal', () => {
  const component = (
    <KuiModal
      onClose={() => {}}
      {...requiredProps}
    >
      children
    </KuiModal>
  );

  expect(render(component)).toMatchSnapshot();
});
