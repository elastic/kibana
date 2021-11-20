/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import React from 'react';
import { HeaderExtension } from './header_extension';

describe('HeaderExtension', () => {
  it('calls navControl.render with div node', () => {
    const renderSpy = jest.fn();
    mount(<HeaderExtension extension={renderSpy} />);

    expect(renderSpy.mock.calls.length).toEqual(1);

    const [divNode] = renderSpy.mock.calls[0];
    expect(divNode).toBeInstanceOf(HTMLElement);
  });

  it('calls navControl.render with div node as inlineBlock', () => {
    const renderSpy = jest.fn();
    mount(<HeaderExtension extension={renderSpy} display={'inlineBlock'} />);

    const [divNode] = renderSpy.mock.calls[0];
    expect(divNode).toHaveAttribute('style', 'display: inline-block;');
  });

  it('calls unrender callback when unmounted', () => {
    const unrenderSpy = jest.fn();
    const render = () => unrenderSpy;

    const wrapper = mount(<HeaderExtension extension={render} />);

    wrapper.unmount();
    expect(unrenderSpy.mock.calls.length).toEqual(1);
  });
});
