/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { NotFoundPrompt } from './not_found_prompt';

describe('<NotFoundPrompt />', () => {
  it('renders', () => {
    const component = render(<NotFoundPrompt />);
    expect(component.text()).toContain('Page not found');
  });

  it('has a default action with a "Go back" button', () => {
    const component = mount(<NotFoundPrompt />);
    const goBackButton = component.find('EuiButtonEmpty');
    expect(goBackButton.text()).toBe('Go back');

    const backSpy = jest.spyOn(history, 'back');
    act(() => {
      goBackButton.simulate('click');
    });
    expect(backSpy).toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it('Renders custom actions', () => {
    const actions = [<button>I am a button</button>];
    const component = render(<NotFoundPrompt actions={actions} />);
    expect(component.text()).toContain('I am a button');
  });
});
