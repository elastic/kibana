jest.mock('ui/chrome',
  () => ({
    getKibanaVersion: () => '6.0.0',
    setVisible: () => {},
  }), { virtual: true });

import React from 'react';
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import chrome from 'ui/chrome';

import {
  ExitFullScreenButton,
} from './exit_full_screen_button';

import { keyCodes } from '@elastic/eui';


test('is rendered', () => {
  const component = render(
    <ExitFullScreenButton onExitFullScreenMode={() => {}}/>
  );

  expect(component)
    .toMatchSnapshot();
});

describe('onExitFullScreenMode', () => {
  test('is called when the button is pressed', () => {
    const onExitHandler = sinon.stub();

    const component = mount(
      <ExitFullScreenButton onExitFullScreenMode={onExitHandler} />
    );

    component.find('button').simulate('click');

    sinon.assert.calledOnce(onExitHandler);
  });

  test('is called when the ESC key is pressed', () => {
    const onExitHandler = sinon.stub();

    mount(<ExitFullScreenButton onExitFullScreenMode={onExitHandler} />);

    const escapeKeyEvent = new KeyboardEvent('keydown', { keyCode: keyCodes.ESCAPE });
    document.dispatchEvent(escapeKeyEvent);

    sinon.assert.calledOnce(onExitHandler);
  });
});

describe('chrome.setVisible', () => {
  test('is called with false when the component is rendered', () => {
    chrome.setVisible = sinon.stub();

    const component = mount(
      <ExitFullScreenButton onExitFullScreenMode={() => {}} />
    );

    component.find('button').simulate('click');

    sinon.assert.calledOnce(chrome.setVisible);
    sinon.assert.calledWith(chrome.setVisible, false);
  });

  test('is called with true the component is unmounted', () => {
    const component = mount(
      <ExitFullScreenButton onExitFullScreenMode={() => {}} />
    );

    chrome.setVisible = sinon.stub();
    component.unmount();

    sinon.assert.calledOnce(chrome.setVisible);
    sinon.assert.calledWith(chrome.setVisible, true);
  });
});
