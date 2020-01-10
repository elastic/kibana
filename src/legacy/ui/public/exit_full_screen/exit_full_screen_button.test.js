/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock(
  'ui/chrome',
  () => ({
    getKibanaVersion: () => '6.0.0',
    setVisible: () => {},
  }),
  { virtual: true }
);

import React from 'react';
import { mountWithIntl, renderWithIntl } from 'test_utils/enzyme_helpers';
import sinon from 'sinon';
import chrome from 'ui/chrome';

import { ExitFullScreenButton } from './exit_full_screen_button';

import { keyCodes } from '@elastic/eui';

test('is rendered', () => {
  const component = renderWithIntl(<ExitFullScreenButton onExitFullScreenMode={() => {}} />);

  expect(component).toMatchSnapshot();
});

describe('onExitFullScreenMode', () => {
  test('is called when the button is pressed', () => {
    const onExitHandler = sinon.stub();

    const component = mountWithIntl(<ExitFullScreenButton onExitFullScreenMode={onExitHandler} />);

    component.find('button').simulate('click');

    sinon.assert.calledOnce(onExitHandler);
  });

  test('is called when the ESC key is pressed', () => {
    const onExitHandler = sinon.stub();

    mountWithIntl(<ExitFullScreenButton onExitFullScreenMode={onExitHandler} />);

    const escapeKeyEvent = new KeyboardEvent('keydown', { keyCode: keyCodes.ESCAPE });
    document.dispatchEvent(escapeKeyEvent);

    sinon.assert.calledOnce(onExitHandler);
  });
});

describe('chrome.setVisible', () => {
  test('is called with false when the component is rendered', () => {
    chrome.setVisible = sinon.stub();

    const component = mountWithIntl(<ExitFullScreenButton onExitFullScreenMode={() => {}} />);

    component.find('button').simulate('click');

    sinon.assert.calledOnce(chrome.setVisible);
    sinon.assert.calledWith(chrome.setVisible, false);
  });

  test('is called with true the component is unmounted', () => {
    const component = mountWithIntl(<ExitFullScreenButton onExitFullScreenMode={() => {}} />);

    chrome.setVisible = sinon.stub();
    component.unmount();

    sinon.assert.calledOnce(chrome.setVisible);
    sinon.assert.calledWith(chrome.setVisible, true);
  });
});
