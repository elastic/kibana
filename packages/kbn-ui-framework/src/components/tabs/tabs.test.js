import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiTabs,
} from './tabs';

describe('KuiTabs', () => {
  test('renders', () => {
    const component = (
      <KuiTabs {...requiredProps} />
    );

    expect(render(component)).toMatchSnapshot();
  });
});
