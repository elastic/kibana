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

import React from 'react';
import sinon from 'sinon';
import { ExitFullScreenButton } from './exit_full_screen_button';
import { keys } from '@elastic/eui';
import { mount } from 'enzyme';

test('is rendered', () => {
  const component = mount(<ExitFullScreenButton onExitFullScreenMode={() => {}} />);

  expect(component).toMatchSnapshot();
});

describe('onExitFullScreenMode', () => {
  test('is called when the button is pressed', () => {
    const onExitHandler = sinon.stub();

    const component = mount(<ExitFullScreenButton onExitFullScreenMode={onExitHandler} />);

    component.find('button').simulate('click');

    sinon.assert.calledOnce(onExitHandler);
  });

  test('is called when the ESC key is pressed', () => {
    const onExitHandler = sinon.stub();

    mount(<ExitFullScreenButton onExitFullScreenMode={onExitHandler} />);

    const escapeKeyEvent = new KeyboardEvent('keydown', { key: keys.ESCAPE } as any);
    document.dispatchEvent(escapeKeyEvent);

    sinon.assert.calledOnce(onExitHandler);
  });
});
