/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount as enzymeMount, ReactWrapper } from 'enzyme';
import { keys } from '@elastic/eui';

import {
  SharedUxServicesProvider,
  SharedUxServices,
  mockServicesFactory,
} from '@kbn/shared-ux-services';
import { ExitFullScreenButton } from './exit_full_screen_button';

describe('<ExitFullScreenButton />', () => {
  let services: SharedUxServices;
  let mount: (element: JSX.Element) => ReactWrapper;

  beforeEach(() => {
    services = mockServicesFactory();
    mount = (element: JSX.Element) =>
      enzymeMount(<SharedUxServicesProvider {...services}>{element}</SharedUxServicesProvider>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('is rendered', () => {
    const component = mount(<ExitFullScreenButton onExit={jest.fn()} />);

    expect(component).toMatchSnapshot();
  });

  test('passing `false` to toggleChrome does not toggle chrome', () => {
    const component = mount(<ExitFullScreenButton onExit={jest.fn()} toggleChrome={false} />);
    expect(services.platform.setIsFullscreen).toHaveBeenCalledTimes(0);
    component.unmount();
    expect(services.platform.setIsFullscreen).toHaveBeenCalledTimes(0);
  });

  describe('onExit', () => {
    const onExitHandler = jest.fn();
    let component: ReactWrapper;

    beforeEach(() => {
      component = mount(<ExitFullScreenButton onExit={onExitHandler} toggleChrome={true} />);
    });

    test('is called when the button is pressed', () => {
      expect(services.platform.setIsFullscreen).toHaveBeenLastCalledWith(false);

      component.find('button').simulate('click');

      expect(onExitHandler).toHaveBeenCalledTimes(1);

      component.unmount();

      expect(services.platform.setIsFullscreen).toHaveBeenLastCalledWith(true);
    });

    test('is called when the ESC key is pressed', () => {
      expect(services.platform.setIsFullscreen).toHaveBeenLastCalledWith(false);

      const escapeKeyEvent = new KeyboardEvent('keydown', { key: keys.ESCAPE } as any);
      document.dispatchEvent(escapeKeyEvent);

      expect(onExitHandler).toHaveBeenCalledTimes(1);

      component.unmount();

      expect(services.platform.setIsFullscreen).toHaveBeenLastCalledWith(true);
    });
  });
});
