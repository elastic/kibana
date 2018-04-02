import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { <%= componentName %> } from './<%= fileName %>';

describe('<%= componentName %>', () => {
  test('is rendered', () => {
    const component = render(
      <<%= componentName %> {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });
});
