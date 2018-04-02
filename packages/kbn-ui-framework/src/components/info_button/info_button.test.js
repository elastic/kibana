import React from 'react';
import { render } from 'enzyme';

import {
  KuiInfoButton,
} from './info_button';

describe('KuiInfoButton', () => {
  describe('Baseline', () => {
    test('is rendered', () => {
      const $button = render(
        <KuiInfoButton />
      );

      expect($button)
        .toMatchSnapshot();
    });

    test('HTML attributes are rendered', () => {
      const $button = render(
        <KuiInfoButton
          aria-label="aria label"
          className="testClass1 testClass2"
          data-test-subj="test subject string"
        />
      );

      expect($button)
        .toMatchSnapshot();
    });
  });
});
