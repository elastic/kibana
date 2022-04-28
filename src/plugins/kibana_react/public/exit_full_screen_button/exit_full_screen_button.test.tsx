/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { ExitFullScreenButton } from './exit_full_screen_button';
import { keys } from '@elastic/eui';
import type { ChromeStart } from '@kbn/core/public';

const MockChrome = {
  setIsVisible: jest.fn(),
} as unknown as ChromeStart;

describe('<ExitFullScreenButton />', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('is rendered', () => {
    const component = mount(
      <ExitFullScreenButton onExitFullScreenMode={jest.fn()} chrome={MockChrome} />
    );

    expect(component).toMatchSnapshot();
  });

  test('passing `false` to toggleChrome does not toggle chrome', () => {
    const component = mount(
      <ExitFullScreenButton
        onExitFullScreenMode={jest.fn()}
        chrome={MockChrome}
        toggleChrome={false}
      />
    );
    expect(MockChrome.setIsVisible).toHaveBeenCalledTimes(0);
    component.unmount();
    expect(MockChrome.setIsVisible).toHaveBeenCalledTimes(0);
  });

  describe('onExitFullScreenMode', () => {
    const onExitHandler = jest.fn();
    let component: ReactWrapper;

    beforeEach(() => {
      component = mount(
        <ExitFullScreenButton onExitFullScreenMode={onExitHandler} chrome={MockChrome} />
      );
    });

    test('is called when the button is pressed', () => {
      expect(MockChrome.setIsVisible).toHaveBeenLastCalledWith(false);

      component.find('button').simulate('click');

      expect(onExitHandler).toHaveBeenCalledTimes(1);
      component.unmount();
      expect(MockChrome.setIsVisible).toHaveBeenLastCalledWith(true);
    });

    test('is called when the ESC key is pressed', () => {
      expect(MockChrome.setIsVisible).toHaveBeenLastCalledWith(false);

      const escapeKeyEvent = new KeyboardEvent('keydown', { key: keys.ESCAPE } as any);
      document.dispatchEvent(escapeKeyEvent);

      expect(onExitHandler).toHaveBeenCalledTimes(1);
      component.unmount();
      expect(MockChrome.setIsVisible).toHaveBeenLastCalledWith(true);
    });
  });
});
