import React from 'react';
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import {
  KuiExpression,
} from './expression';

describe('KuiExpression', () => {
  test('renders', () => {
    const component = (
      <KuiExpression {...requiredProps} />
    );

    expect(render(component)).toMatchSnapshot();
  });

  describe('Props', () => {
    describe('children', () => {
      test('is rendered', () => {
        const component = render(
          <KuiExpression>
            some expression
          </KuiExpression>
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
