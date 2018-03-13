import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFlexGrid } from './flex_grid';

describe('KuiFlexGrid', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFlexGrid columns={3} {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
