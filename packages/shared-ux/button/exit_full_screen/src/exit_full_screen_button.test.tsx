/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper, mount as enzymeMount } from 'enzyme';
import { keys } from '@elastic/eui';

import {
  getExitFullScreenButtonServicesMock,
  getExitFullScreenButtonKibanaDependenciesMock,
} from '../mocks';

import { ExitFullScreenButton } from './exit_full_screen_button';
import { ExitFullScreenButtonKibanaProvider, ExitFullScreenButtonProvider } from './services';
import { of } from 'rxjs';

const componentServices = getExitFullScreenButtonServicesMock();
const kibanaServices = getExitFullScreenButtonKibanaDependenciesMock();

export const componentMount = (element: JSX.Element) =>
  enzymeMount(
    <ExitFullScreenButtonProvider {...componentServices}>{element}</ExitFullScreenButtonProvider>
  );

export const kibanaMount = (element: JSX.Element) =>
  enzymeMount(
    <ExitFullScreenButtonKibanaProvider {...kibanaServices}>
      {element}
    </ExitFullScreenButtonKibanaProvider>
  );

describe('<ExitFullScreenButton />', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('with manual services', () => {
    test('is rendered', () => {
      const component = componentMount(<ExitFullScreenButton onExit={jest.fn()} />);
      expect(component.render()).toMatchSnapshot();
    });

    test('passing `false` to toggleChrome does not toggle chrome', () => {
      const component = componentMount(
        <ExitFullScreenButton onExit={jest.fn()} toggleChrome={false} />
      );
      expect(componentServices.setIsFullscreen).toHaveBeenCalledTimes(0);

      component.unmount();
      expect(componentServices.setIsFullscreen).toHaveBeenCalledTimes(0);
    });

    describe('onExit', () => {
      const onExitHandler = jest.fn();
      let component: ReactWrapper;

      beforeEach(() => {
        component = componentMount(
          <ExitFullScreenButton onExit={onExitHandler} toggleChrome={true} />
        );
      });

      test('is called when the button is pressed', () => {
        expect(componentServices.setIsFullscreen).toHaveBeenLastCalledWith(true);

        component.find('button').simulate('click');
        expect(onExitHandler).toHaveBeenCalledTimes(1);

        component.unmount();
        expect(componentServices.setIsFullscreen).toHaveBeenLastCalledWith(false);
      });

      test('is called when the ESC key is pressed', () => {
        expect(componentServices.setIsFullscreen).toHaveBeenLastCalledWith(true);

        const escapeKeyEvent = new KeyboardEvent('keydown', { key: keys.ESCAPE } as any);
        document.dispatchEvent(escapeKeyEvent);
        expect(onExitHandler).toHaveBeenCalledTimes(1);

        component.unmount();
        expect(componentServices.setIsFullscreen).toHaveBeenLastCalledWith(false);
      });
    });
  });

  describe('with kibana services', () => {
    test('is rendered', () => {
      const component = kibanaMount(<ExitFullScreenButton onExit={jest.fn()} />);
      expect(component.render()).toMatchSnapshot();
    });

    test('passing `false` to toggleChrome does not toggle chrome', () => {
      const component = kibanaMount(
        <ExitFullScreenButton onExit={jest.fn()} toggleChrome={false} />
      );
      expect(kibanaServices.coreStart.chrome.setIsVisible).toHaveBeenCalledTimes(0);

      component.unmount();
      expect(kibanaServices.coreStart.chrome.setIsVisible).toHaveBeenCalledTimes(0);
    });

    test('renders custom logo', () => {
      kibanaServices.coreStart.customBranding.customBranding$ = of({
        logo: 'imageSrcAsBase64encodedstring',
      });
      const component = kibanaMount(
        <ExitFullScreenButton onExit={jest.fn()} toggleChrome={false} />
      );
      expect(component.render()).toMatchSnapshot();
    });

    describe('onExit', () => {
      const onExitHandler = jest.fn();
      let component: ReactWrapper;

      beforeEach(() => {
        component = kibanaMount(
          <ExitFullScreenButton onExit={onExitHandler} toggleChrome={true} />
        );
      });

      test('is called when the button is pressed', () => {
        expect(kibanaServices.coreStart.chrome.setIsVisible).toHaveBeenLastCalledWith(false);

        component.find('button').simulate('click');
        expect(onExitHandler).toHaveBeenCalledTimes(1);

        component.unmount();
        expect(kibanaServices.coreStart.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
      });

      test('is called when the ESC key is pressed', () => {
        expect(kibanaServices.coreStart.chrome.setIsVisible).toHaveBeenLastCalledWith(false);

        const escapeKeyEvent = new KeyboardEvent('keydown', { key: keys.ESCAPE } as any);
        document.dispatchEvent(escapeKeyEvent);
        expect(onExitHandler).toHaveBeenCalledTimes(1);

        component.unmount();
        expect(kibanaServices.coreStart.chrome.setIsVisible).toHaveBeenLastCalledWith(true);
      });
    });
  });
});
