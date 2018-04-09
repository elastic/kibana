import React from 'react';
import { render } from 'enzyme';

import { KuiOutsideClickDetector } from './outside_click_detector';

describe('KuiOutsideClickDetector', () => {
  test('is rendered', () => {
    const component = render(
      <KuiOutsideClickDetector onOutsideClick={() => {}}>
        <div />
      </KuiOutsideClickDetector>
    );

    expect(component)
      .toMatchSnapshot();
  });
});
