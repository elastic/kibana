/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
